module.exports = {
  RallyUS: /(?:^|\W)US([0-9]{3,9}).*$/im,
  RallyDE: /(?:^|\W)DE([0-9]{3,9}).*$/im,
  RallyF: /(?:^|\W)F([0-9]{3,9}).*$/im,
  RallyI: /(?:^|\W)I([0-9]{3,9}).*$/im,
  RallyAllOld: /(?:^|\W)(US|DE|F|I|TC|TS)([0-9]{2,9}).*$/im,
  RallyAll: /(?:^|^\s|[^\/a-zA-Z0-9])(US|DE|F|I|TA|TC|TS)\s?([0-9]{2,9})/gim,
  syncEnable: /.*enable sync.*/i,
  syncDisable: /.*disable sync.*/i,
  KBase: /(?:^|^\s|[^\/a-zA-Z0-9])(?:tn|kb|ArticlesKB)\s?([0-9]+)/gim,
  supportCase: /(?:^|^\s|[^\/a-zA-Z0-9])(?:case|case\snumber|#)(?:\:|,|)\s{0,3}?([0-9]{6,7})/gim,
  genericIDNumber: /([0-9]{6,7}).*$/im,
  setSME: /set me(?:^|^\s|[a-zA-Z0-9\s]+)sme(.*)/i,
  setSMEShort: /(?:^|^\s|[a-zA-Z0-9\s]+)sme(.*)/i,
  logTask: /log(?:^|^\s|[a-zA-Z0-9\s]+)task(.*)/i,
  logTaskShort: /(?:^|^\s|[a-zA-Z0-9\s]+)task(.*)/i,
  greetings: /(.*)\s(?:hi|hey|hello|aloha|howdy|hola|ciao|what\'s\sup|sup).*/i,
  quotes: /.*(?:quote|quotes).*/i,
  timezone: /.*(?:time)\s{0,3}(.*)/i,
  lookup: /.*(?:lookup)\s{0,3}(.*)/i
};
