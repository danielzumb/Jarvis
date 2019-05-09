const rallyLib = require('../rallyLib');
const debug = require('debug')('rally:flow');

const generatePlainAttachmentStr = require('../SlackHelpers/generatePlainAttachmentStr');
const addDeleteButton = require('../SlackHelpers/addDeleteButton');
const isCaseMentioned = require('../Regex/isCaseMentioned');
const isMessagePrivate = require('../SlackHelpers/isMessagePrivate');

const getAttachmentField = require('../SlackHelpers/attachments/getAttachmentField');

const getDefaultFields = result => {
  return [
    getAttachmentField('Sheduled State', result.ScheduleState, true),
    getAttachmentField('Scrum Team', result.Project, true),
    getAttachmentField(
      'State',
      result.GeneralState && result.GeneralState.Name
        ? result.GeneralState.Name
        : result.GeneralState,
      true
    ),
    getAttachmentField('Iteration', result.Iteration, true),
    getAttachmentField('Scheduled Release', result.ScheduleRelease, true),
    getAttachmentField('Production Release', result.ActualRelease, true)
  ];
};

const shouldShowFooter = idPrefix => {
  switch (idPrefix) {
    case 'TC':
      return false;

    case 'TS':
      return false;

    default:
      return true;
  }
};

const getFieldsForObjectType = (result, idPrefix) => {
  switch (idPrefix) {
    case 'TC':
      return [
        getAttachmentField('Type', result.Type, true),
        getAttachmentField('Scrum Team', result.Project, true),
        getAttachmentField('Method', result.Method, true),
        getAttachmentField('Test Case Status', result.c_TestCaseStatus, true)
      ];

    case 'TS':
      return [
        getAttachmentField('Sheduled State', result.ScheduleState, true),
        getAttachmentField('Scrum Team', result.Project, true),
        getAttachmentField('Production Release', result.ActualRelease, true),
        getAttachmentField('Iteration', result.Iteration, true),
        getAttachmentField('Plan Estimate', result.PlanEstimate, true)
      ];

    default:
      return getDefaultFields(result);
  }
};

const getColourForAttachmentResult = result => {
  return result.DisplayColor ? result.DisplayColor : '#36a64f';
};

const getLinkFields = (result, idPrefix) => {
  const linkButtons = [];
  linkButtons.push({
    type: 'button',
    text: 'Go to Rally',
    url: result.url,
    style: 'primary'
  });

  if (!shouldShowFooter(idPrefix)) return linkButtons;

  linkButtons.push({
    type: 'button',
    text: 'Go to Gateway',
    url: result.urlPortalIP,
    style: 'primary'
  });
  return linkButtons;
};



const addRallyFooter = (result, attachmentObject) => {
  const footerLabel = 'No rally access? Click here';
  attachmentObject.attachments.push({
    fallback: footerLabel,
    footer: `<${result.urlPortal}|${footerLabel}>`,
    footer_icon: 'http://connect.tech/2016/img/ca_technologies.png'
  });
};

const getAttachmentForRallyResult = (result, idPrefix, attachments = [], trimResult = false) => {
  const body = {
    fallback: 'Snapshot of ' + result.ID,
    color: getColourForAttachmentResult(result, idPrefix),
    title: result.ID + ': ' + result.name,
    title_link: result.url,
    fields: getFieldsForObjectType(result, idPrefix)
  };
  if (trimResult) {
    delete body.fields;
  }

  attachments.push(body);
  attachments.push({
    fallback: 'Rally Links',
    actions: getLinkFields(result, idPrefix)
  });
  return attachments;
}

const generateAttachmentForResults = (resultsArray = [], typePrefix = 'DE', attachments = [], trimResult = false) => {
  resultsArray.forEach(result => getAttachmentForRallyResult(result, typePrefix, attachments, trimResult));
}

const generateSnapshotAttachment = (result, idPrefix) => {
  const results = {
    attachments: [
      {
        fallback: 'Snapshot of ' + result.ID,
        color: getColourForAttachmentResult(result, idPrefix),
        title: result.ID + ': ' + result.name,
        title_link: result.url,
        fields: getFieldsForObjectType(result, idPrefix)
      },
      {
        fallback: 'Rally Links',
        actions: getLinkFields(result, idPrefix)
      }
    ]
  };

  // remove any "fields" from the first attachment object, if they don't have a value
  for (let i = 0; i < results.attachments[0].fields.length; i++) {
    if (
      !results.attachments[0].fields[i].value ||
      results.attachments[0].fields[i].value == 'N/A'
    ) {
      results.attachments[0].fields[i] = null;
    }
  }

  return results;
};

const handleConversationFn = async (
  controller,
  bot,
  message,
  listOfIds,
  err,
  convo
) => {
  if (err) {
    console.error(
      `handleConversationFn failed to start convo due to error: `, err
    );
    convo.stop();
    return err;
  }

  const user = await controller.extDB.lookupUser(bot, message);
  if (!user) {
    console.error(
      `extDB.lookupUser failed when processing ${formattedRallyID}`
    );
    convo.stop();
    return err;
  }

  return rallyLib
    .queryRallyWithIds(listOfIds, user.sf_username)
    .then(resultObjectsByType => {
      const attachments = [];

      // since we're printing multiple results, keep them trimmed
      const trimResult = true;

      // build message results
      for (const typeString in resultObjectsByType) {
        const results = resultObjectsByType[typeString];
        const typePrefix = rallyLib.getPrefixForRallyType(typeString);

        generateAttachmentForResults(results, typePrefix, attachments, trimResult);
      }

      const message = { attachments };

      addDeleteButton(message, 'Hide Message');

      convo.say(message);
      convo.next();
    })
    .then(() => {
      // log query result stats by type
      listOfIds.forEach(rallyId => {
        // log a successful query for a rally item
        controller.logStat('rally', rallyId[0]);
      });
    })
    .catch(error => {
      console.error('Rally lookup failed due to error: ', error);

      const header = error.errorMSG
        ? `Error fetching ${formattedRallyID} : ${error.errorID}`
        : 'Unhandled Rally Lookup Error';
      const message = error.errorMSG
        ? error.errorMSG
        : error.stack
          ? error.stack
          : error;

      const slackResponseAttachments = generatePlainAttachmentStr(
        header,
        message
      );

      addDeleteButton(slackResponseAttachments);
      convo.say(slackResponseAttachments);
      return convo.stop();
    });
};

const shouldAddCommentForPrefix = IDprefix => {
  if (IDprefix == 'TC') return false;
  return true;
};

const addMentionToRallyDiscussion = async (
  controller,
  bot,
  IDprefix,
  formattedID,
  message
) => {
  if (!shouldAddCommentForPrefix(IDprefix)) return false;

  const slackURL = controller.utils.getURLFromMessage(message);
  const channel = await controller.extDB.lookupChannel(bot, message);
  const user = await controller.extDB.lookupUser(bot, message);
  if (!channel || !user) {
    console.error(
      `addMentionToRallyDiscussion failed to lookup channel (${channel}) or user (${user}) info`
    );
  }

  // disable for private channels, per request
  if (isMessagePrivate(message)) return Promise.resolve(false);

  return rallyLib
    .addCommentToRallyTicket(
      IDprefix,
      formattedID,
      message,
      user,
      `#${channel.slack_channel_name}`,
      slackURL
    )
    .then(result => {
      // log a successful query for a rally item
      controller.logStat('rally', 'comment');
    })
    .catch(error => {
      console.warn(
        `Failed to add comment to rally ticket: ${JSON.stringify(error)}`
      );
    });
};

const getRallyTagsForEvent = (IDprefix, formattedID, message) => {
  const channel = message.channel;
  const envKey = `channelTags${channel}`;
  const channelTagsString = process.env[envKey];

  if (!channelTagsString) return [];

  return channelTagsString.split(',');
};

const addTagToRallyObject = async (
  controller,
  bot,
  IDprefix,
  formattedID,
  message
) => {
  // These are the rally tags we WANT this object to have
  const tagNamesArray = getRallyTagsForEvent(IDprefix, formattedID, message);
  if (!tagNamesArray.length) return true;

  // These are the rally tags this object already has
  const existingTags = await rallyLib.getTagsForRallyWithID(formattedID);

  const currentSet = new Set(existingTags);
  // these are the tags that aren't in the rally object yet
  const missingTags = tagNamesArray.filter(x => !currentSet.has(x));

  // refuse to continue if the object already has the tags we want, nothing to do.
  if (!missingTags.length) return true;

  // We have tags that are missing in this object, so lets add them in
  debug(
    `Adding ${
      missingTags.length
    } tags (${missingTags}) to rally object (${formattedID})`
  );
  return rallyLib
    .addTagsToRallyWithID(IDprefix, formattedID, missingTags)
    .then(results => {
      debug(
        `Successfully added tags (${tagNamesArray}) to rally object (${formattedID}): `,
        JSON.stringify(results)
      );
      controller.logStat('rallytags', tagNamesArray.length);
    })
    .catch(err => {
      console.error(
        `Error seen trying to add tags (${tagNamesArray}) to rally object (${formattedID}): `,
        err.message
      );
    });
};

module.exports = (controller, bot, message, listOfIds = []) => {
  /*
    - query mulitple rally IDs at once
    - build results into one response
    - add comment once per rally ID
  */
  console.log(`Rally query for ${listOfIds}`);

  // if a direct message, direct reply (no thread)
  if (message.type == 'direct_message') {
    bot.startConversation(message, (err, convo) =>
      handleConversationFn(
        controller,
        bot,
        message,
        listOfIds,
        err,
        convo
      )
    );
    return true;
  }

  // else, start thread (tidier)
  bot.startConversationInThread(message, (err, convo) =>
    handleConversationFn(
      controller,
      bot,
      message,
      listOfIds,
      err,
      convo
    )
  );

  // log query result stats by type
  listOfIds.forEach(async rallyId => {
    const prefix = rallyId[0];
    const formattedID = rallyId.join('').toUpperCase();

    // add mention in Rally ticket, for slack discussion
    await addMentionToRallyDiscussion(
      controller,
      bot,
      prefix,
      formattedID,
      message
    );

    // tag automation request for feedback channel
    addTagToRallyObject(controller, bot, prefix, formattedID, message);
  });

  return true;
};
