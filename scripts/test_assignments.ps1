$assignments = @(
    @{ agent = "ceo_treasurer"; task = "Interactive floor build" },
    @{ agent = "deckwright"; task = "Card telemetry pass" },
    @{ agent = "marketpulse"; task = "Economy sanity check" },
    @{ agent = "gameplaysystems"; task = "Status indicator verification" },
    @{ agent = "shoploop"; task = "Mission board sync" },
    @{ agent = "hypeforge"; task = "Portrait detailing" },
    @{ agent = "cryptosentinel"; task = "Crypto revenue scan" },
    @{ agent = "moneymachine"; task = "Cloudflare deployment" }
)

foreach ($item in $assignments) {
  $body = @{ agent_id = $item.agent; task_description = $item.task; assigned_by = "CEO_Treasurer"; assigned_to = $item.agent }
  Invoke-WebRequest -Uri "http://localhost:4000/tasks/assign" -Method Post -Body ($body | ConvertTo-Json) -ContentType "application/json" -UseBasicParsing | Out-Null
}
