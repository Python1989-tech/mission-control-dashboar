$agents = @(
    @("CEO_Treasurer","Executive AI"),
    @("Deckwright","Gameplay Systems Director"),
    @("MarketPulse","Economy Analyst"),
    @("GameplaySystems","Engineering Architect"),
    @("ShopLoop","Simulation Operator"),
    @("HypeForge","Creative Director"),
    @("CryptoSentinel","Crypto Intelligence Agent"),
    @("MoneyMachine","Product & Revenue Systems Agent")
)

$generator = Join-Path $PSScriptRoot "generate_agent_portrait.ps1"

foreach ($agent in $agents) {
    Write-Host "Generating portrait for $($agent[0])"
    & $generator $agent[0] $agent[1]
}
