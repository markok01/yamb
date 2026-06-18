# Yamb Engine — Pretpostavke (Faza 1)

Dokumentovane interpretacije za nejasna pravila iz specifikacije.
Ako nešto treba drugačije — ispravka ide u engine pre UI/backend faze.

## Bodovanje

| Red | Pravilo |
|-----|---------|
| 1–6 | Zbir kockica tog broja (npr. `[1,1,3,5,6]` u polju „1" = **2**) |
| Maximum / Minimum | Zbir svih 5 kockica |
| Kenta | **66** ako validna, inače **0** |
| Triling / Ful / Poker / Jamb | Zbir svih kockica ako validna kombinacija, inače **0** |
| Σ(1–6) | Zbir redova 1–6; **+30** bonus ako zbir ≥ 60 |
| Razlika | `(Maximum − Minimum) × broj jedinica` u kockicama za **Minimum** polje |
| Razlika = 0 | Ako Minimum ≤ 5 **ili** broj jedinica ≤ 1 |
| UKUPNO | Σ(1–6) + bonus + Razlika + Σ(kombinacije) |

## Kolone — redosled

| Kolona | Redosled popunjavanja |
|--------|----------------------|
| REDOVNA | 1 → 2 → … → 6 → Max → Min → Kenta → … → Jamb |
| OBRNUTA | Jamb → … → 1 (obrnuto) |
| PREKOREDA / RUČNA / DOJAVA / OBAVEZNA / MAKSIMALNA | Bilo koji slobodan red |
| DVOSTRUKA gornji | Maximum → 6 → 5 → 4 → 3 → 2 → 1 |
| DVOSTRUKA donji | Minimum → Kenta → Triling → Ful → Poker → Jamb |
| DVOSTRUKA start | Može od **Maximum** ili od **Minimum**; prvo se završi izabrana grana, pa druga |
| UKRŠTENA gornji | 1 → 2 → … → 6 → Maximum |
| UKRŠTENA donji | Jamb → Poker → Ful → Triling → Kenta → Minimum |
| UKRŠTENA start | Može od **1** ili od **Jamb**; prvo se završi izabrana grana, pa druga |

## OBAVEZNA

Otključava se kada je **≥ 70%** ćelija popunjeno u **ostalih 9 kolona** (po igraču).

## DOJAVA tie-break

Kod izjednačenog skora, preferira se kombinacioni red (Jamb > Poker > Ful > Triling > Kenta > Maximum > …).

## MAKSIMALNA

Samo fiksne dozvoljene vrednosti — kockice se ne validiraju protiv skora.

## RUČNA

Igrač unosi score; sistem proverava da li odgovara kockicama (ili 0 za nevalidnu kombinaciju).
