const {Bugfender} = require('@bugfender/sdk');


Bugfender.init({
	appKey: '9adi5EIAAGCRVgJbsP3FslZxQ8YP1VLi',
});
Bugfender.setDeviceKey('user_email', 'jackmord445@gmail.com');
Bugfender.log("Logger initiated!");
module.exports = Bugfender;