$entries = @(
    @{id='deckwright'; task='Card telemetry pass'},
    @{id='marketpulse'; task='Floor layout QA & verification'},
    @{id='gameplaysystems'; task='Floor rendering logic sync'},
    @{id='shoploop'; task='Floor integration + event wiring'},
    @{id='hypeforge'; task='Floor sprite & prop styling pass'},
    @{id='moneymachine'; task='Fix Creator Lab video-improvement page'},
    @{id='cryptosentinel'; task='Crypto revenue scan'}
)

foreach ($entry in $entries) {
    .\set_worker_status.ps1 -Agents @($entry.id) -Status 'WORKING' -Task $entry.task -Stage 'In progress'
}

.\set_worker_status.ps1 -Agents @('ceo_treasurer') -Status 'WORKING' -Task 'Coordinating floor + task redistribution' -Stage 'Delegation'
