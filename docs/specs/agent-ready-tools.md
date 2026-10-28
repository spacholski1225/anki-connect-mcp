# Toole Anki MCP gotowe dla agenta

## Problem

Serwer MCP ma być podpięty do dedykowanego agenta od fiszek, ale w obecnej postaci agent nie może na nim polegać:

- Błędy zgłaszane przez AnkiConnect (np. nieistniejący deck, duplikat notatki) wracają do agenta jako zwykła, udana odpowiedź. Agent może uznać, że karta została dodana, choć nie została.
- Gdy Anki jest wyłączone, agent dostaje surowy wyjątek HTTP zamiast zrozumiałej informacji.
- Toole nie mają opisów: model widzi tylko nazwę i parametry, więc nie wie, kiedy którego użyć ani w jakiej kolejności.
- Klient nie wie, które toole tylko czytają, a które usuwają dane, więc nie może bezpiecznie zatwierdzać ich automatycznie.
- Serwer wystawia około 46 tooli, w tym sterowanie GUI Anki, aktualizację wtyczki i surowe `multi`. Utrudnia to agentowi wybór właściwego toola i omija zabezpieczenia.
- Wyszukiwanie może zwrócić tysiące ID, a informacje o kartach zawierają pełny HTML z CSS. To zapycha agentowi kontekst.
- Paczka ma błędy w zależnościach (zależy sama od siebie, brakuje `zod`, SDK jest stare), martwy i zdublowany kod oraz konfigurację Dockera, która nie pasuje do serwera stdio.

## Rozwiązanie

Każdy tool ma opis, tytuł i adnotacje (tylko odczyt / destrukcyjny). Serwer przy połączeniu przekazuje agentowi instrukcje pracy z Anki. Każdy błąd, czy to z AnkiConnect, czy z braku połączenia, wraca jako błąd toola z czytelnym komunikatem. Domyślnie widoczny jest tylko zestaw tooli potrzebny do pracy z notatkami, kartami i deckami. Toole GUI i zaawansowane włącza się zmiennymi środowiskowymi. Wyszukiwanie ma limit wyników, a odpowiedzi są odchudzone. Serwer obsługuje klucz API AnkiConnect. Paczka, zależności i Docker zostają naprawione.

## Wymagane zachowanie

- Gdy klient pobiera listę tooli, każdy tool ma niepusty opis i tytuł.
- Gdy klient pobiera listę tooli, każdy tool ma adnotacje `readOnlyHint` i `destructiveHint` zgodne z tym, co robi (np. `find_notes` tylko czyta, `delete_decks` jest destrukcyjny).
- Gdy klient się łączy, serwer zwraca instrukcje opisujące pracę z Anki.
- Gdy AnkiConnect zwraca niepusty `error`, wynik toola ma `isError: true`, a jego treść zawiera tekst błędu z AnkiConnect.
- Gdy AnkiConnect nie odpowiada (Anki wyłączone, zły adres, timeout), wynik toola ma `isError: true` z komunikatem, który podaje adres i sugeruje sprawdzenie, czy Anki z AnkiConnect jest uruchomione. Serwer działa dalej.
- Gdy wywołanie się powiedzie, treść wyniku to sam `result` z AnkiConnect, bez koperty `{result, error}`.
- Gdy zmienna włączająca toole GUI nie jest ustawiona, toole `gui_*` nie pojawiają się na liście tooli.
- Gdy zmienna włączająca toole GUI jest ustawiona, toole `gui_*` są dostępne.
- Gdy zmienna włączająca toole zaawansowane nie jest ustawiona, `multi`, `upgrade` i toole edytujące konfigurację decków nie pojawiają się na liście tooli.
- Gdy ustawiony jest klucz API AnkiConnect, każde żądanie do AnkiConnect zawiera go w polu `key`.
- Gdy klucz API nie jest ustawiony, żądania nie zawierają pola `key`.
- Gdy `find_notes` lub `find_cards` znajdzie więcej wyników niż limit, zwraca najwyżej tyle ID, ile wynosi limit, razem z łączną liczbą wyników i informacją o obcięciu.
- Gdy agent poda własny limit, wyszukiwanie go respektuje.
- Gdy `cards_info` zwraca karty, pytanie i odpowiedź nie zawierają bloków CSS.
- Gdy klient pyta serwer o wersję, dostaje wersję z paczki, a nie wpisaną na sztywno.
- Gdy paczka jest instalowana, nie zależy sama od siebie, a `zod` jest jej jawną zależnością.

## Decyzje implementacyjne

- Toole są definiowane deklaratywnie: nazwa, tytuł, opis, schemat wejścia, adnotacje i handler. Rejestruje je jedna pętla, a wszystkie wywołania przechodzą przez jeden wrapper, który zamienia odpowiedź lub wyjątek na wynik MCP. Wzorzec pochodzi z `streamable-mcp-server-template` _(agreed)_.
- Toole są rejestrowane przez aktualne API SDK (`registerTool`), a nie przez przestarzałe `server.tool`. SDK zostaje podniesione do najnowszego 1.x, a `zod` staje się jawną zależnością _(agreed)_.
- Serwer przekazuje `instructions`, które opisują: składnię zapytań Anki, różnicę między note ID a card ID oraz zalecaną kolejność przy dodawaniu kart (sprawdź decki → sprawdź pola modelu → `can_add_notes` → `add_notes`) _(agreed)_.
- Błąd z AnkiConnect i błąd połączenia są obsługiwane w jednym miejscu, w kliencie AnkiConnect lub we wrapperze toola, a nie w każdym toolu osobno _(agreed)_.
- Udany wynik zwraca sam `result` jako JSON, bez koperty _(Claude's call)_.
- Toole są podzielone na trzy grupy _(Claude's call co do podziału i nazw zmiennych)_:
  - **domyślna**, zawsze włączona: notatki, karty, tagi, decki (bez edycji konfiguracji), modele, `version`;
  - **GUI**, włączana przez `ANKI_MCP_ENABLE_GUI`: wszystkie `gui_*`;
  - **zaawansowana**, włączana przez `ANKI_MCP_ENABLE_ADVANCED`: `multi`, `upgrade`, `save_deck_config`, `set_deck_config_id`, `clone_deck_config_id`, `remove_deck_config_id`.
- Za destrukcyjne uznane są: `delete_decks`, `remove_deck_config_id`, `save_deck_config`, `update_note_fields`, `remove_tags`, `change_deck`, `gui_exit_anki`, `upgrade` i `multi`. Toole wyłącznie odczytujące mają `readOnlyHint: true` _(Claude's call co do dokładnej listy)_.
- `create_flashcard` zostaje usunięty, bo dubluje `add_note` i ma na sztywno deck `Default`, model `Basic` oraz tag `ai` _(Claude's call)_.
- `find_notes` i `find_cards` dostają opcjonalny parametr `limit`, domyślnie 100. Wynik zawiera listę ID, łączną liczbę wyników i flagę obcięcia _(Claude's call co do wartości domyślnej i kształtu wyniku)_.
- `cards_info` usuwa bloki `<style>` z pytania i odpowiedzi, a pole z samym CSS pomija _(Claude's call)_.
- Klucz API AnkiConnect jest czytany ze zmiennej `ANKI_CONNECT_API_KEY` i dołączany jako pole `key` do każdego żądania _(agreed)_.
- Wersja serwera jest czytana z paczki _(agreed)_.
- Paczka nie zależy sama od siebie _(agreed)_.
- Zdublowane funkcje GUI zostają w jednej wersji, a nieużywana kopia znika _(agreed)_.
- Docker zostaje dostosowany do stdio: bez wystawiania portu, bez automatycznego restartu, z obrazem Node w wersji wspieranej (co najmniej 20). README opisuje uruchomienie z podpiętym stdin _(Claude's call: naprawić, a nie usuwać)_.
- Projekt dostaje skrypty `typecheck` i `test` _(Claude's call)_.
- Ponieważ usunięcie `create_flashcard`, ukrycie części tooli i zmiana kształtu odpowiedzi łamią zgodność, wersja paczki idzie na 2.0.0 _(Claude's call)_.
- README zostaje zaktualizowane: lista tooli, zmienne środowiskowe i grupy tooli _(Claude's call)_.

## Testowanie

- **Seam:** protokół MCP. Klient MCP z SDK łączy się z serwerem w pamięci, a w miejscu AnkiConnect działa lokalny, fałszywy serwer HTTP wskazany przez `ANKI_CONNECT_URL`. Fake rejestruje otrzymane żądania i zwraca zaprogramowane odpowiedzi.
- **Rozważane alternatywy:**
  - testy jednostkowe handlerów z zamockowanym klientem HTTP: nie sprawdzają rejestracji, opisów, adnotacji ani grup tooli, czyli tego, co widzi agent;
  - testy na prawdziwym Anki: wymagają uruchomionej aplikacji, zmieniają kolekcję i nie nadają się do CI.
- **Zachowania do zweryfikowania:**
  - każdy tool na liście ma opis, tytuł i adnotacje; wybrane toole mają poprawne `readOnlyHint` i `destructiveHint`;
  - serwer zwraca `instructions` i wersję z paczki;
  - `error` z AnkiConnect daje `isError: true` z tekstem błędu;
  - brak serwera pod `ANKI_CONNECT_URL` daje `isError: true` z czytelnym komunikatem, a kolejne wywołanie nadal działa;
  - udany wynik nie zawiera koperty;
  - bez flag nie ma tooli `gui_*` ani zaawansowanych; z flagami są;
  - z `ANKI_CONNECT_API_KEY` fake otrzymuje pole `key`, a bez niego go nie otrzymuje;
  - wyszukiwanie respektuje limit domyślny i podany, zwraca łączną liczbę wyników i flagę obcięcia;
  - `cards_info` nie zawiera CSS;
  - `create_flashcard` nie istnieje.

## Poza zakresem

- Transport Streamable HTTP, OAuth, sesje, storage i Cloudflare Workers z template'u. AnkiConnect jest lokalny, więc stdio wystarcza. Wróci to dopiero, jeśli agent ma działać zdalnie.
- Rejestracja tooli do mediów (`store_media_file` itd.). Ich implementacja zostaje w repo nieużywana. (zastąpione przez [media-attachments.md](./media-attachments.md))
- `outputSchema` i `structuredContent` dla tooli.
- Lintowanie i formatowanie (biome).
- Paginacja kursorem. Wystarczy limit.
- Budowa samego dedykowanego agenta.

## Otwarte pytania

Brak. Rozstrzygnięte: wersja 2.0.0 wychodzi od razu, bez okresu przejściowego _(agreed)_. Agent na razie nie potrzebuje tooli GUI, więc domyślnie pozostają wyłączone _(agreed)_.
