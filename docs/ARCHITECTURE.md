# System Architecture

```mermaid
flowchart LR
  subgraph Frontend [Presentation (React)]
    A[SearchView (UC 1.1/1.2)]
    B[ResultsView + MapView (UC 2.x)]
    C[WeatherTab (UC 3.x)]
    D[AuthView (UC 4.1)]
  end

  subgraph API [Express Controllers]
    AC[CarparkController]
    WC[WeatherController]
    AU[AuthController]
    US[UserController]
  end

  subgraph Services [Application Services]
    CS[CarparkService]
    NS[NEAService]
    AS[AuthService]
    PS[UserService]
  end

  subgraph Adapters [Integration Adapters]
    GE[GeocoderOneMap]
    RT[RouteOneMap]
    HDB[HDBCarparkAdapter]
    NEA[NEAWeatherAdapter]
  end

  subgraph Data [Data/Persistence]
    CSV[(HDB CSV + Rates)]
    DB[(Prisma: User, Profile, Favorite, QueryLog)]
  end

  A --> AC
  B --> AC
  C --> WC
  D --> AU

  AC --> CS
  WC --> NS
  AU --> AS
  US --> PS

  CS --> HDB
  CS --> RT
  NS --> NEA
  CS --> CSV
  AS --> DB
  PS --> DB
