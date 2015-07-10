var base      = require('taskcluster-base');
var assert    = require('assert');
var _         = require('lodash');

// Common schema prefix
var SCHEMA_PREFIX_CONST = 'http://schemas.taskcluster.net/github/v1/';

/** Build common routing key construct for `exchanges.declare` */
var commonRoutingKey = function(options) {
    options = options || {};
    return [
        {
          name:             'routingKeyKind',
          summary:          "Identifier for the routing-key kind. This is " +
                            "always `'primary'` for the formalized routing key.",
          constant:         'primary',
          required:         true
        }, {
          name:             'organizationName',
          summary:          "The GitHub `organizationName` which had an event.",
          maxSize:          100,
          required:         true
        }, {
          name:             'repositoryName',
          summary:          "The GitHub `repositoryName` which had an event.",
          maxSize:          100,
          required:         true
        },{
          name:             'action',
          summary:          "The GitHub `action` which triggered an event.",
          maxSize:          22,
          required:         options.hasActions || false
        }

    ]
};

var commonMessageBuilder = function(msg) {
    msg.version = 1;
    return msg;
};

/** Declaration of exchanges offered by the github */
var exchanges = new base.Exchanges({
  title:      "TaskCluster-Github Exchanges",
  description: [
    "The github service, typically available at",
    "`github.taskcluster.net`, is responsible for publishing a pulse",
    "message for supported github events.",
    "",
    "This document describes the exchange offered by the taskcluster",
    "github service"
  ].join('\n')
});

/** pull request exchange */
exchanges.declare({
  exchange:           'pull-request',
  name:               'pullRequest',
  title:              "GitHub Pull Request Event",
  description: [
    "When a GitHub pull request event is posted it will be broadcast on this",
    "exchange with the designated `organizationName` and `repositoryName`",
    "in the routing-key along with event specific metadata in the payload."
  ].join('\n'),
  routingKey:         commonRoutingKey({hasActions: true}),
  schema:             SCHEMA_PREFIX_CONST + 'github-pull-request-message.json#',
  messageBuilder:     commonMessageBuilder,
  routingKeyBuilder:  msg => _.pick(msg, 'organizationName', 'repositoryName', 'action'),
  CCBuilder:          () => []
});

/** push exchange */
exchanges.declare({
  exchange:           'push',
  name:               'push',
  title:              "GitHub push Event",
  description: [
    "When a GitHub push event is posted it will be broadcast on this",
    "exchange with the designated `organizationName` and `repositoryName`",
    "in the routing-key along with event specific metadata in the payload."
  ].join('\n'),
  routingKey:         commonRoutingKey(),
  schema:             SCHEMA_PREFIX_CONST + 'github-push-message.json#',
  messageBuilder:     commonMessageBuilder,
  routingKeyBuilder:  msg => _.pick(msg, 'organizationName', 'repositoryName'),
  CCBuilder:          () => []
});

// Export exchanges
module.exports = exchanges;
