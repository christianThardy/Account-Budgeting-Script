This script pauses an individual Google Ads account when it meets its specified budget. It sends a notification to 
the users email detailing the maximum ad spend for the account, the final cost that activated the script and 
which campaigns were paused.

To use this script at the Google Ads MCC level:

The current argument of the AdwordsApp.account class from the Adwords API provides information about the account in 
which a script is currently running. At the MCC level this process iterates through multiple accounts.

reference: https://developers.google.com/adwords/scripts/docs/examples/mcc-scripts#update-multiple-accounts-in-series
