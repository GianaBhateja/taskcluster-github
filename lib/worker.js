var debug       = require('debug')('github:worker');
var tcrc        = require('./taskclusterrc');
var github      = require('./github');
var request     = require('request-promise')
var taskcluster = require('taskcluster-client')
var slugid      = require('slugid');

var worker = module.exports = {};

/**
 * If a .taskclusterrc exists, attempt to turn it into a taskcluster
 * task payload, and submit it to the queue.
 **/
worker.pullRequestHandler = async function(message, context) {
  debug('handling pull request: ', message);
  let msgPayload = message.payload;
  // Try to fetch a taskclusterrc file for every request
  let taskclusterrc = await request(tcrc.buildConfigUrl(msgPayload));
  if (taskclusterrc) {
    try {
      let scheduler = new taskcluster.Scheduler(context.cfg.get('taskcluster'));
      let graphConfig = await tcrc.processConfig(taskclusterrc, msgPayload);
      let graphStatus = await scheduler.createTaskGraph(slugid.v4(), graphConfig);
    } catch(e) {
      debug(e);
      // Let the user know that there was a problem processing their
      // config file
      let statusUpdate = await github.updatePullRequestStatus(context.githubAPI, {
          user:        msgPayload.organization,
          repo:        msgPayload.repository,
          sha:         msgPayload.details.headSha,
          state:       'error',
          description: e.toString()});
    }
  };
};

/**
 * Take actions, such as posting updates to GitHub, when the
 * status of a task changes.
 **/
worker.graphStateChangeHandler = async function(message, context) {
  try {
    debug('handling state change for message: ', message);
    let route = message.routes[0].split('.');
    let inspectorUrl = 'https://tools.taskcluster.net/task-graph-inspector/#'
    let statusUpdate = await github.updatePullRequestStatus(context.githubAPI, {
      user:         route[1],
      repo:         route[2],
      sha:          route[3],
      state:        github.statusMap[message.payload.status.state],
      target_url:   inspectorUrl + message.payload.status.taskGraphId,
      description:  'TaskGraph: ' + message.payload.status.state,
      context:      'TaskCluster'});
    // A resulting object indicates failure
    if (statusUpdate) {
      throw Error(statusUpdate);
    }
  } catch(e) {
    debug(e);
  }
};
