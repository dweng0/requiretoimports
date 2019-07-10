define(['index/router',
       'dashboard/router',
       'dataflow/router',
       'jobs/router',
       'licenses/router',
       'logmanager/router',
       'lognotification/router',
       'monitor/router',
       'nodemanager/router',
       'policies/router',
       'rbac/router',
       'reports/router',
       'restore/router',
       'schedules/router',
       'settings/router',
       'storage/router',
       'services/router'],
       function(IndexRouter,
                DashboardRouter,
                DataFlowRouter,
                JobsRouter,
                LicensesRouter,
                LogManagerRouter,
                NotificationsManagerRouter,
                MonitorRouter,
                NodeManagerRouter,
                PolicyManagerRouter,
                RbacRouter,
                ReportsRouter,
                RestoreRouter,
                ScheduleManagerRouter,
                SettingsRouter,
                StorageManager,
                ServicesRouter) {
	'use strict';

	var Routers = {
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
});
