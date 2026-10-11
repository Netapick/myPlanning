# Fait confiance au certificat de signature de myPlanning sur CE poste, pour
# que Windows n'affiche plus « éditeur inconnu » à l'installation.
# Utilisateur courant uniquement : pas besoin d'être administrateur.
# Windows demandera une confirmation pour l'ajout aux autorités racines : répondre « Oui ».
$cer = Join-Path $PSScriptRoot 'myPlanning.cer'
Import-Certificate -FilePath $cer -CertStoreLocation Cert:\CurrentUser\TrustedPublisher | Out-Null
Import-Certificate -FilePath $cer -CertStoreLocation Cert:\CurrentUser\Root | Out-Null
Write-Host 'Certificat myPlanning installé. Tu peux lancer l''installateur.'
