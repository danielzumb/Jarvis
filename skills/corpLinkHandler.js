const fs = require('fs');
const request = require('request');

const cleanRawPath = string => {
  const forwardPath = string.replace(/\\/g, '/').replace('>', '');

  return forwardPath;
};

const getLocalPathFromLink = link => {
  const cleanedLink = cleanRawPath(link);
  const regex = /.*\/clients\/(.*.[a-zA-Z]{1,9}).*/gm;
  let m;
  while ((m = regex.exec(cleanedLink)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }

    return m[1];
  }
};

const getFileName = link => {
  const splitPath = link.split('/');
  return splitPath[splitPath.length - 1];
};

const uploadFileToSlack = (
  localFilePath,
  authToken,
  channels,
  thread_ts,
  filename,
  contentType = 'application/zip'
) => {
  return new Promise((resolve, reject) => {
    fs.stat(localFilePath, (error, stats) => {
      if (error) return reject(error);
      const fileSizeInBytes = stats.size;
      //Convert the file size to megabytes
      const fileSizeInMegabytes = fileSizeInBytes / 1000000.0;

      if (fileSizeInMegabytes > 50)
        return reject(`File size > 50mb (real: ${fileSizeInMegabytes})`);
      console.log(`File size: ${fileSizeInMegabytes.toFixed(2)}MB`);

      const fileStream = fs.createReadStream(localFilePath);
      const requestBody = {
        url: 'https://slack.com/api/files.upload',
        formData: {
          token: authToken,
          channels,
          file: {
            value: fileStream,
            options: {
              filename: `${filename}`,
              contentType
            }
          }
        }
      };

      if (thread_ts) requestBody.formData.thread_ts = thread_ts;

      request.post(requestBody, (error, response) => {
        if (error) return reject(error);
        return resolve(JSON.parse(response.body));
      });
    });
  });
};

// these are process.env references from .env. The .env reference is to a local mount of these network dirs.
const getMountPathKey = (localLink = '') => {
  // just "in case", case becomes an issue here, normalise all to lower-case
  const lowerCaseLink = localLink.toLowerCase();

  // if (lowerCaseLink.includes('corp-fs1-tech')) return 'clientsfs1techMount';

  // default to fs1-was and fs-was (newest), if the link isn't to fs1-tech
  return 'clientsfswasMount';
};

const cleanLocalPath = path => {
  return path.replace('&amp;', '&');
};

const getClickableLocalLink = (linkStr, isWindows) => {
  const fs1ServerName = process.env.serverName1;
  const fs1ServerIP = process.env.serverIP1;

  const tech_srvName = process.env.serverName2;
  const tech_srvIP = process.env.serverIP2;

  const fs1ServerName2 = process.env.serverName3;
  const fs1ServerIP2 = process.env.serverIP3;

  linkStr = cleanRawPath(linkStr);

  // unnecessary char from parsed URL can happen sometimes

  if (!isWindows) {
    linkStr = linkStr.replace(fs1ServerName, fs1ServerIP);
    linkStr = linkStr.replace(fs1ServerName2, fs1ServerIP2);
    linkStr = linkStr.replace(tech_srvName, tech_srvIP);
  }

  linkStr = linkStr.substring(linkStr.indexOf('//'));
  linkStr = linkStr.substr(0, linkStr.lastIndexOf('/'));
  linkStr = linkStr.substring(linkStr.indexOf(':') + 1);

  const prefix = isWindows ? 'file:///' : 'smb:';
  return `${prefix}${linkStr}/`;
};

const regexArray = [
  /.*(file:\/\/.*)/i,
  /.*(\\\\prod.*)/i,
  /.*(\\\\corp.*)/i,
  /.*(\\\\supp-fs.*)/i
];

const registerSlackListenerFn = controller => {
  controller.hears(
    regexArray,
    'direct_message,direct_mention,mention',
    (bot, message) => {
      const matchedText = message.match[1];
      const responseAttachments = {
        // text: 'Links to access the file share:',
        attachments: [
          {
            fallback: 'Links to access the file share:',
            text: 'Links to access the file share:',
            actions: [
              {
                type: 'button',
                text: 'Windows',
                style: 'primary',
                url: getClickableLocalLink(matchedText, true)
              },
              {
                type: 'button',
                text: 'MacOS',
                style: 'primary',
                url: getClickableLocalLink(matchedText)
              }
            ]
          }
        ]
      };

      // console.log(`Fixed corp link: ${JSON.stringify(responseAttachments)}`);
      bot.reply(message, responseAttachments);
      controller.logStat('fsLinkLookup', matchedText);

      const localPath = getLocalPathFromLink(matchedText);
      if (!localPath) {
        console.log(
          `Not processing path further as it doesn't seem to be to a file directly: ${matchedText}`
        );
        return true;
      }

      console.log('Trying to process file at path: ', localPath);

      const localPrefix = process.env[getMountPathKey(matchedText)];
      // console.log("file system link: ", localPath);

      const realLocalPath = cleanLocalPath(`${localPrefix}/${localPath}`);

      console.log('Real local path resolved to: ', realLocalPath);
      const filename = getFileName(realLocalPath);

      uploadFileToSlack(
        realLocalPath,
        bot.config.token,
        message.channel,
        message.thread_ts,
        filename
      )
        .then(response => {
          controller.logStat('fsLinkLookupUploaded', realLocalPath);
          // console.log(response);
        })
        .catch(error => {
          console.error(
            `${filename} upload to slack failed due to error: ${error}, ${
              error.code
            }`
          );
          if (!error.code) return false;
          if (error.code == 'ENOENT') {
            return bot.reply(
              message,
              "This link's directly to a file, but I couldn't find the file itself. Note that I can't access `corp-fs1-was` links right now :cry:"
            );
          }
        });

      return true;
    }
  );
};

module.exports = registerSlackListenerFn;
