import ExpoModulesCore
import Foundation
import Network

// Stille Telefonbestätigung (Telekom Verify): Der Netzbetreiber erkennt die
// SIM nur an einer Anfrage über die mobile Datenverbindung. URLSession nimmt
// die aktive Verbindung (meist WLAN) — deshalb hier ein schlichtes HTTP/1.1
// über NWConnection mit requiredInterfaceType = .cellular, inklusive der
// Weiterleitungen über die Server der Netzbetreiber.
public class MobilfunkAnfrageModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MobilfunkAnfrage")

    AsyncFunction("get") { (adresse: String, promise: Promise) in
      guard let url = URL(string: adresse), url.host != nil else {
        promise.reject("E_URL", "Ungültige Adresse")
        return
      }
      MobilfunkHttp(maxWeiterleitungen: 10, zeitlimit: 10).get(url) { ergebnis in
        switch ergebnis {
        case .success(let antwort):
          promise.resolve(["status": antwort.status, "body": antwort.body])
        case .failure(let fehler):
          promise.reject("E_MOBILFUNK", fehler.localizedDescription)
        }
      }
    }
  }
}

struct MobilfunkAntwort {
  let status: Int
  let body: String
}

enum MobilfunkFehler: LocalizedError {
  case keinMobilfunk
  case zeitueberschreitung
  case ungueltigeAntwort
  case zuVieleWeiterleitungen
  case verbindung(String)

  var errorDescription: String? {
    switch self {
    case .keinMobilfunk: return "Keine mobile Datenverbindung verfügbar"
    case .zeitueberschreitung: return "Zeitüberschreitung"
    case .ungueltigeAntwort: return "Ungültige Antwort"
    case .zuVieleWeiterleitungen: return "Zu viele Weiterleitungen"
    case .verbindung(let text): return text
    }
  }
}

final class MobilfunkHttp {
  private let maxWeiterleitungen: Int
  private let zeitlimit: TimeInterval
  private let queue = DispatchQueue(label: "de.sanime.mobilfunk-anfrage")

  init(maxWeiterleitungen: Int, zeitlimit: TimeInterval) {
    self.maxWeiterleitungen = maxWeiterleitungen
    self.zeitlimit = zeitlimit
  }

  func get(_ url: URL, abschluss: @escaping (Result<MobilfunkAntwort, Error>) -> Void) {
    anfrage(url, rest: maxWeiterleitungen, abschluss: abschluss)
  }

  private func anfrage(_ url: URL, rest: Int, abschluss: @escaping (Result<MobilfunkAntwort, Error>) -> Void) {
    guard let host = url.host else { return abschluss(.failure(MobilfunkFehler.ungueltigeAntwort)) }
    let https = url.scheme?.lowercased() != "http"
    let port = NWEndpoint.Port(rawValue: UInt16(url.port ?? (https ? 443 : 80)))!
    let parameter: NWParameters = https ? .tls : .tcp
    parameter.requiredInterfaceType = .cellular

    let verbindung = NWConnection(host: NWEndpoint.Host(host), port: port, using: parameter)
    var erledigt = false
    let beenden: (Result<MobilfunkAntwort, Error>) -> Void = { ergebnis in
      if erledigt { return }
      erledigt = true
      verbindung.cancel()
      abschluss(ergebnis)
    }

    queue.asyncAfter(deadline: .now() + zeitlimit) { beenden(.failure(MobilfunkFehler.zeitueberschreitung)) }

    verbindung.stateUpdateHandler = { zustand in
      switch zustand {
      case .ready:
        var pfad = url.path.isEmpty ? "/" : url.path
        if let query = url.query { pfad += "?\(query)" }
        let kopf = "GET \(pfad) HTTP/1.1\r\nHost: \(host)\r\nUser-Agent: SaniMe\r\nAccept: */*\r\nConnection: close\r\n\r\n"
        verbindung.send(content: kopf.data(using: .utf8), completion: .contentProcessed { fehler in
          if let fehler { beenden(.failure(MobilfunkFehler.verbindung(fehler.localizedDescription))) }
        })
        self.lesen(verbindung, puffer: Data()) { daten in
          guard let daten, let antwort = HttpAntwort(daten) else {
            return beenden(.failure(MobilfunkFehler.ungueltigeAntwort))
          }
          if (300...399).contains(antwort.status), let ziel = antwort.kopf["location"], let naechste = URL(string: ziel, relativeTo: url)?.absoluteURL {
            if rest <= 0 { return beenden(.failure(MobilfunkFehler.zuVieleWeiterleitungen)) }
            if erledigt { return }
            erledigt = true
            verbindung.cancel()
            self.anfrage(naechste, rest: rest - 1, abschluss: abschluss)
            return
          }
          beenden(.success(MobilfunkAntwort(status: antwort.status, body: antwort.text)))
        }
      // Kein Mobilfunk (WLAN-only, Daten aus, Simulator): nicht warten.
      case .waiting:
        beenden(.failure(MobilfunkFehler.keinMobilfunk))
      case .failed(let fehler):
        beenden(.failure(MobilfunkFehler.verbindung(fehler.localizedDescription)))
      default:
        break
      }
    }
    verbindung.start(queue: queue)
  }

  private func lesen(_ verbindung: NWConnection, puffer: Data, fertig: @escaping (Data?) -> Void) {
    verbindung.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { daten, _, ende, fehler in
      var gesamt = puffer
      if let daten { gesamt.append(daten) }
      if ende || fehler != nil {
        fertig(gesamt.isEmpty ? nil : gesamt)
      } else {
        self.lesen(verbindung, puffer: gesamt, fertig: fertig)
      }
    }
  }
}

// Minimaler HTTP/1.1-Antwortparser: Statuszeile, Kopfzeilen, Body (auch
// chunked) — mehr braucht die Weiterleitungskette nicht.
struct HttpAntwort {
  let status: Int
  let kopf: [String: String]
  let text: String

  init?(_ daten: Data) {
    guard let trenner = daten.range(of: Data("\r\n\r\n".utf8)),
          let kopfText = String(data: daten.subdata(in: 0..<trenner.lowerBound), encoding: .utf8) else { return nil }
    let zeilen = kopfText.components(separatedBy: "\r\n")
    let statusTeile = zeilen.first?.split(separator: " ") ?? []
    guard statusTeile.count >= 2, let status = Int(statusTeile[1]) else { return nil }
    var kopf: [String: String] = [:]
    for zeile in zeilen.dropFirst() {
      guard let doppelpunkt = zeile.firstIndex(of: ":") else { continue }
      kopf[zeile[..<doppelpunkt].lowercased()] = zeile[zeile.index(after: doppelpunkt)...].trimmingCharacters(in: .whitespaces)
    }
    var body = daten.subdata(in: trenner.upperBound..<daten.count)
    if kopf["transfer-encoding"]?.lowercased().contains("chunked") == true {
      body = HttpAntwort.entchunken(body)
    }
    self.status = status
    self.kopf = kopf
    self.text = String(data: body, encoding: .utf8) ?? ""
  }

  static func entchunken(_ daten: Data) -> Data {
    var ergebnis = Data()
    var index = daten.startIndex
    let crlf = Data("\r\n".utf8)
    while index < daten.endIndex {
      guard let zeilenEnde = daten.range(of: crlf, in: index..<daten.endIndex),
            let groesseText = String(data: daten.subdata(in: index..<zeilenEnde.lowerBound), encoding: .utf8),
            let groesse = Int(groesseText.split(separator: ";").first?.trimmingCharacters(in: .whitespaces) ?? "", radix: 16) else { break }
      if groesse == 0 { break }
      let start = zeilenEnde.upperBound
      let ende = min(start + groesse, daten.endIndex)
      ergebnis.append(daten.subdata(in: start..<ende))
      index = min(ende + crlf.count, daten.endIndex)
    }
    return ergebnis
  }
}
