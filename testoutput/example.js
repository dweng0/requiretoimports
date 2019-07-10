import IndexRouter from 'index/router';
import DashboardRouter from 'dashboard/router';
import DataFlowRouter from 'dataflow/router';
import JobsRouter from 'jobs/router';
import LicensesRouter from 'licenses/router';
import LogManagerRouter from 'logmanager/router';
import NotificationsManagerRouter from 'lognotification/router';
import MonitorRouter from 'monitor/router';
import NodeManagerRouter from 'nodemanager/router';
import PolicyManagerRouter from 'policies/router';
import RbacRouter from 'rbac/router';
import ReportsRouter from 'reports/router';
import RestoreRouter from 'restore/router';
import ScheduleManagerRouter from 'schedules/router';
import SettingsRouter from 'settings/router';
import StorageManager from 'storage/router';
import ServicesRouter from 'services/router';

'use strict';

var  Routers = {
	initialize: function()
	{
		new IndexRouter();
		new DashboardRouter();
		new DataFlowRouter();
		new JobsRouter();
		new LicensesRouter();
		new LogManagerRouter();
		new NotificationsManagerRouter();
		new MonitorRouter();
		new NodeManagerRouter();
		new PolicyManagerRouter();
		new RbacRouter();
		new ReportsRouter();
		new RestoreRouter();
		new ScheduleManagerRouter();
		new SettingsRouter();
		new StorageManager();
		new ServicesRouter();
	}
};

return Routers;