DEBUG = 0;

function main() {
  
  // Gathers miscellaneous information about a given account 
  Logger.log("");
  currentSetting = new Object();
  currentSetting.scope = "Account"; 
  currentSetting.maxCost = getFloat("498.99"); // monthly account budget goes here
  currentSetting.budgetPeriod = "Monthly";
  currentSetting.labelName = "Paused by ABS";
  currentSetting.labelToAdd = "Paused by Account Budget Script";
  currentSetting.email = " ";  // your email goes here (optional)
  currentSetting.pauseItems = "yes";
  currentSetting.reEnableItems = "yes";
  currentSetting.logText = "";
  currentSetting.currencyCode = AdWordsApp.currentAccount().getCurrencyCode();
  
  // Enables the account at the beginning of the month
  switch(currentSetting.reEnableItems.toLowerCase()) {
    case "no":
      currentSetting.reEnableAtStartOfNewPeriod = 0;
      break;
    case "yes":
      currentSetting.reEnableAtStartOfNewPeriod = 1;
      break;
  }
  switch(currentSetting.pauseItems.toLowerCase()) {
    case "no":
      currentSetting.pauseWhenExceeds = 0;
      break;
    case "yes":
      currentSetting.pauseWhenExceeds = 1;
      break;
  }
  switch(currentSetting.budgetPeriod) {
      
    case "Monthly":
      currentSetting.dateRange = "THIS_MONTH";
        break;
  }
  var thenAction = "Pause"; // Alert
  var condition1 = "Cost > " + currentSetting.maxCost;
  var labelCondition = "Status = ENABLED";
  if(currentSetting.labelName) {
    labelCondition = "LabelNames CONTAINS_ANY ['" + currentSetting.labelName + "']";
  }
  if(DEBUG == 1) Logger.log("labelCondition: " + labelCondition);

  currentSetting.enabledCounter = 0;
  currentSetting.deletedCounter = 0;
  currentSetting.pausedCounter = 0;
  currentSetting.enabledList = new Array();
  currentSetting.pausedList = new Array();
  currentSetting.deletedList = new Array();
  // Label set up 
  var labelToAddText = currentSetting.labelToAdd + " (" + currentSetting.budgetPeriod + ")";
  Logger.log("labelToAddText: " + labelToAddText);
  currentSetting.labelToAdd = labelToAddText;
  if(currentSetting.labelToAdd) {
    createLabel(currentSetting.labelToAdd, "This label is used by an automated tool and its name should not be changed.");
  }
  if(currentSetting.reEnableAtStartOfNewPeriod) {
    // Check current date, day and time
    currentSetting.thisAccountTime = getTimeInThisAccount();
    var currentHour = currentSetting.thisAccountTime.HH;
    var dayOfWeek = currentSetting.thisAccountTime.dayOfWeek;
    var dd = currentSetting.thisAccountTime.dd;
    
    //Re-activate paused items when start of a new period
    var pluralText = "";
    if(currentSetting.budgetPeriod.toLowerCase().indexOf("Monthly") != -1) {
      if(dd == 1 && currentHour == 0) {   // change the value of the currentHour variable to change the time in which 
        reEnable();                       // the account resets (takes values 0-23)
        var emailType = "Notification";
        var body = 'Resetting monthly budgets on the ' + dd + 'st of the month at ' + currentHour + "h<br/>";
        if(currentSetting.enabledList.length > 0) {
          body += "<br/>";
          body += "Re-Enabled Because We Started a New Monthly Budget Period:<br/><ul>";
          
          for(var itemCounter = 0; itemCounter < currentSetting.enabledList.length; itemCounter++) {
            var item = currentSetting.enabledList[itemCounter];
            body += "<li>" + item + "</li>";;
          }
          body += "</ul>";
          body += "<br/>" + "PPC Team @ <b>ChoiceLocal</b>";
        }
        sendEmailNotifications(currentSetting.email, "Monthly Budgets Reset", body, emailType );
        if(currentSetting.enabledList.length > 1) pluralText = "s";
        currentSetting.logText += currentSetting.enabledList.length + " " + currentSetting.scope + pluralText + " enabled. ";
      }
    }
  }
  // Checks if budget has exceeded
  if(currentSetting.scope.toLowerCase().indexOf("account") != -1) {
    var fields = "Cost";
    var reportIterator = AdWordsApp.report('SELECT ' + fields +
      ' FROM ACCOUNT_PERFORMANCE_REPORT DURING ' + currentSetting.dateRange).rows();
    
    while(reportIterator.hasNext()) {
    var row = reportIterator.next();
    var cost = getFloat(row["Cost"]).toFixed(2);
      if(DEBUG == 1) Logger.log("Cost: " + cost + " currentSetting.maxCost: " + currentSetting.maxCost);
    }
    if(cost > currentSetting.maxCost) {
      // check if all campaigns are paused
      var campaignIterator = AdWordsApp.campaigns()
      .withCondition("Status = ENABLED")
      .get();
      
      var numActiveCampaigns = campaignIterator.totalNumEntities();
      
      if(numActiveCampaigns > 0) {

        var body = "The total cost for the account '" + AdWordsApp.currentAccount().getName() + "' " + " is now " + cost + " " + 
        currentSetting.currencyCode + "." + "</b><br/><br/> " + "PPC Team @ <b>ChoiceLocal</b>";
        
        var emailType = "attention";
        sendEmailNotifications(currentSetting.email, "Account Budget Exceeded", body, emailType );
        currentSetting.logText = "Account cost of " + currentSetting.currencyCode + " " + cost + " exceeds the maximum " + 
        currentSetting.budgetPeriod + " cost of " + currentSetting.currencyCode + " " + currentSetting.maxCost.toFixed(2);
        
        if(currentSetting.pauseWhenExceeds) {
          while (campaignIterator.hasNext()) {
            var campaign = campaignIterator.next();
            var name = campaign.getName();
            campaign.pause();
            campaign.applyLabel(currentSetting.labelToAdd);
            currentSetting.pausedCounter++;
            currentSetting.pausedList.push(name);
          }
        }
      }
    } else {
      Logger.log("Account cost is currently " + currentSetting.currencyCode + cost + 
      " and this does not exceed the allowed budget for the account.");
    }
  } 
  // Sends an alert to your email and tells you which campaigns are being paused
  currentSetting.pausedList.sort();
  if(currentSetting.pausedCounter > 1) {
    var pluralText = "s";
  } else {
    var pluralText = "";
  }
  var body = currentSetting.pausedCounter + " " + currentSetting.scope + pluralText + " exceeded the " + 
  currentSetting.budgetPeriod + " maximum cost of " + currentSetting.maxCost.toFixed(2) + " " + currentSetting.currencyCode + " ";
  if(currentSetting.pauseWhenExceeds) body += "and they were paused."; body += "<br/><ul>";
  
  if(DEBUG == 1) Logger.log("currentSetting.email: " + currentSetting.email + " currentSetting.pausedCounter: " + 
    currentSetting.pausedCounter);
  if(currentSetting.email && currentSetting.pausedCounter > 0) {
    
    var changesMadeOrSuggestedText = "suggested";
    if(currentSetting.pauseWhenExceeds) changesMadeOrSuggestedText = "made";
    
    var pausedOrSuggestedText = "exceeded budget";
    if(currentSetting.pauseWhenExceeds) pausedOrSuggestedText = "paused";
    
    var subject = "Campaigns paused for " + AdWordsApp.currentAccount().getName() + ": " + currentSetting.pausedCounter + 
    " change" + pluralText + " " + changesMadeOrSuggestedText; currentSetting.logText += currentSetting.pausedCounter + " " + 
    currentSetting.scope + pluralText + " " + pausedOrSuggestedText; for(var itemCounter = 0; itemCounter < currentSetting.pausedList.length; itemCounter++) {
    var item = currentSetting.pausedList[itemCounter];
    body += "<li>" + item + "</li>";
    }
    body += "</ul>";
    body += "These items were labeled '" + currentSetting.labelToAdd + "' for easy identification.<br/><br/>";
    body += "PPC Team @ <b>ChoiceLocal</b>";
    
    var emailType = "notification";
    if(DEBUG == 1) Logger.log("sending email...");
    sendEmailNotifications(currentSetting.email, subject, body, emailType )
  }
}
  function reEnable(){
  // Renable Individual Campaigns or Account
  if(currentSetting.scope.toLowerCase().indexOf("campaign") != -1 || currentSetting.scope.toLowerCase().indexOf("account") != -1) {
    var iterator = AdWordsApp.campaigns()
     .withCondition("LabelNames CONTAINS_ANY ['" + currentSetting.labelToAdd + "']")
     .get();
    
    while(iterator.hasNext()){
      var item = iterator.next();
      var name = item.getName();
      item.removeLabel(currentSetting.labelToAdd)
      Logger.log("Enabling campaign: " + name);
      item.enable();
      currentSetting.enabledCounter++;
      currentSetting.enabledList.push(name); 
    } 
  } 
}
// Retrieves the current time and date in a given account
// Also utilizes the timezone settings of the account
function getTimeInThisAccount() {
  var weekday = new Array(7);
  weekday[0]=  "Sunday";
  weekday[1] = "Monday";
  weekday[2] = "Tuesday";
  weekday[3] = "Wednesday";
  weekday[4] = "Thursday";
  weekday[5] = "Friday";
  weekday[6] = "Saturday";
  
  var timeZone = AdWordsApp.currentAccount().getTimeZone();
  var date = new Date();
  var thisAccountTime = new Object();
  thisAccountTime.dayOfWeek = parseInt(Utilities.formatDate(date, timeZone, "uu"));
  thisAccountTime.dd =parseInt(Utilities.formatDate(date, timeZone, "dd"));
  thisAccountTime.weekday = weekday[thisAccountTime.dayOfWeek];
  thisAccountTime.HH = parseInt(Utilities.formatDate(date, timeZone, "HH"));
  thisAccountTime.timeZone = timeZone;
  
  return(thisAccountTime);
}
// Makes sure the label doesn't already exists before creating it, also createLabel(name, description, backgroundColor)
function createLabel(name, description, backgroundColor) {
    var backgroundColor = "red"
    var labelIterator = AdWordsApp.labels()
     .withCondition("Name CONTAINS '" + name + "'")
     .get();
    
    if(labelIterator.hasNext()) {
      Logger.log("Label already exists");
    } else {
      Logger.log("Label needs to be created: " + name + " desc: " + description + " color: " + backgroundColor);
      if(description && backgroundColor) {
        AdWordsApp.createLabel(name, description, backgroundColor);
        Logger.log("Label created");
      } else if (description) {
        AdWordsApp.createLabel(name, description);
        Logger.log("Label created");
      } else {
        AdWordsApp.createLabel(name);
        Logger.log("Label created");
      }
    }
  }   
// Check if a label that will be used to search for campaigns is actually used by at
// least 1 of those campaigns.
// This prevents cases where the script fails without error due to a missing label
  function checkIfLabelIsUsed(scope, labelName) {
    var entitiesWithLabel = 0;
    var labelIterator = AdWordsApp.labels()
    .withCondition('Name = "' + labelName + '"')
    .get();
    if (labelIterator.hasNext()) {
      var label = labelIterator.next();
      if(scope.toLowerCase().indexOf("campaign") != -1) entitiesWithLabel = label.campaigns().get().totalNumEntities();
      if(scope.toLowerCase().indexOf("ad group") != -1) entitiesWithLabel = label.adGroups().get().totalNumEntities();
      if(scope.toLowerCase().indexOf("ad text") != -1) entitiesWithLabel = label.ads().get().totalNumEntities();
      if(scope.toLowerCase().indexOf("keyword") != -1) entitiesWithLabel = label.keywords().get().totalNumEntities();
      return(entitiesWithLabel);
    }
    if(!entitiesWithLabel) {
      Logger.log("No campaigns use the label '" + currentSetting.labelName + "' so this script won't do anything.");
    } 
  }
  // Will the email be a notification or attention
  function sendEmailNotifications(emailAddresses, subject, body, emailType ) {
  
    if(emailType.toLowerCase().indexOf("notification") != -1) {
      var finalSubject = "[Notification]" + subject + " - " + AdWordsApp.currentAccount().getName() + " (" + AdWordsApp.currentAccount().getCustomerId() + ")"
    } else if(emailType.toLowerCase().indexOf("attention") != -1) {
      var finalSubject = "[Attention] " + subject + " - " + AdWordsApp.currentAccount().getName() + " (" + AdWordsApp.currentAccount().getCustomerId() + ")"
    }
    if(AdWordsApp.getExecutionInfo().isPreview()) {
      var finalBody = "<b>The ABS script ran in preview mode. No changes were made to your account.</b><br/><br/>" + body;
    } else {
      var finalBody = body;
    }
    
  MailApp.sendEmail({
        to:emailAddresses, 
        subject:  finalSubject,
        htmlBody: finalBody
      });
    if(DEBUG == 1) Logger.log("email sent to " + emailAddresses + ": " + finalSubject);
  }
  function getFloat (input) {
    if(!input || input == "" || typeof(input) === 'undefined') var input = "0.0";
    input = input.toString();
    var output = parseFloat(input.replace(/,/g, ""));
    return output;
  }