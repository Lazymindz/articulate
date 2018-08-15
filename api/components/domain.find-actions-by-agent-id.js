'use strict';

const NoFlo = require('noflo');
const RedisDS = require('../datasources/redis.ds');
const _ = require('lodash');
const PORT_REDIS = 'redis';
const PORT_OUT = 'out';
const PORT_ERROR = 'error';
const PORT_IN = 'in';

exports.getComponent = () => {

    const c = new NoFlo.Component();
    c.description = 'Get all actions by agent id';
    c.icon = 'user';
    c.inPorts.add(PORT_IN, {
        datatype: 'object',
        description: 'Object with all parsed values.'
    });
    c.inPorts.add(PORT_REDIS, {
        datatype: 'object',
        description: 'Redis client'
    });

    c.outPorts.add(PORT_OUT, {
        datatype: 'object'
    });

    c.outPorts.add(PORT_ERROR, {
        datatype: 'object'
    });

    return c.process((input, output) => {

        if (!input.has(PORT_IN)) {
            return;
        }

        if (!input.has(PORT_REDIS)) {
            return;
        }
        const { scope } = input;
        const redis = input.getData(PORT_REDIS);
        const { start, limit, filter, id } = input.getData(PORT_IN);
        let total = 0;
        RedisDS
            .findAllInSet({
                redis,
                start: 0,
                limit: -1,
                type: `domainActions:${id}`,
                subType: 'action'
            })
            .then((actions) => {

                total = actions.length;
                // TODO: Do the filtering and sorting on the DB
                if (filter && filter !== '') {
                    actions = _.filter(actions, (action) => {

                        return action.actionName.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
                    });
                    total = actions.length;
                }
                actions = _.sortBy(actions, 'actionName');
                if (limit !== -1) {
                    actions = actions.slice(start, limit);
                }
                return output.sendDone({ [PORT_OUT]: new NoFlo.IP('data', { actions, total }, { scope }) });
            })
            .catch((err) => {

                return output.sendDone({ [PORT_ERROR]: new NoFlo.IP('data', err, { scope }) });
            });
    });
};
