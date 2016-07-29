'use strict';
const _ = require('lodash');
const mongoose = require('mongoose');
const autopopulate = require('mongoose-autopopulate');
const cms = require('cmsmon');
// cms.mongoose = mongoose;
cms.data.security = false;
cms.listen(8888);
const resolvePath = cms.resolvePath = (p) => `backend/${p}`;
cms.mongoose.connect('mongodb://localhost/store-manager');

cms.use(require('cmsmon/mobile'));
require('./store-manager');

cms.server('backend/en', '');