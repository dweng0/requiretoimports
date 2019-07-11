define(function(require) {
	'use strict';

	const ResourceController = require('shared/controllers/resource');
	const ConfirmDialog = require('shared/dialogs/confirm/confirm');

	// Controller is extended with static method
	const JobController = ResourceController.extend(
	/**
	 * @lends Jobs.Controllers.JobController.prototype
	 */
	{
		initialize: function(options)
		{
			ResourceController.prototype.initialize.call(this, options);
		},

		onActionClick: function(models, collection, event, actionName, actionDisplayName)
		{
			let jobSpecificModels = _.map(models, function(model) {
				return model.getHandlerModel();
			});

			let self = this;
			let onConfirm = function() {
				let data = { actionName: actionDisplayName };
				let successMessage = function(job) { return tr("Initiated '__actionName__' on selected jobs", data); };
				let batchFailMessage = function(job) { return tr("Failed to initiate '__actionName__' on all selected jobs", data); };

				self.performActionRequests(jobSpecificModels,
				                           'invokeAction',
				                           actionName,
				                           successMessage,
				                           successMessage,
				                           batchFailMessage);
			};

			ConfirmDialog.show(tr("Conform Action"),
			                   tr("Perform '__actionName__' on selected job(s)?", { actionName: actionDisplayName }))
			.then(onConfirm);
		}
	});

	JobController.getSpecializedView = function(job)
	{
		let result;
		const handlerInfo = job.get('handlerInfo');

		const getExtension = function(name) {
			return require('application')().getExtension(name);
		}

		if (handlerInfo)
		{
			switch (job.get('type'))
			{
				case 'eJOBTYPE_RESTORE':
				{
					switch (handlerInfo.class)
					{
						case 'restores':
						{
							result = getExtension('repository').jobDetails()['restore'];
							break;
						}
						default:
						{
							console.warn("Cannot display job progress - unhandled job class '%s'", handlerInfo.class);
							break;
						}
					}
					break;
				}
				case 'eJOBTYPE_BACKUP':
				{
					switch (handlerInfo.class)
					{
						// Repository resynchronization
						case 'resynchronizations':
						{
							result = getExtension('repository').jobDetails()['resynchronization'];
							break;
						}
						case 'ReplicationStats':
						{
							result = getExtension('hitachivirtualstorageplatform').jobDetails()['replication'];
							break;
						}
						// HBB FileSystem to Repository
						case 'FileSystemBackup':
						{
							// HBB file system backup
							result = getExtension('oshost').jobDetails()['backup'];
							break;
						}
						case 'VMwareBackup':
						{
							result = getExtension('vmwareesx').jobDetails()['backup'];
							break;
						}
						case 'OracleBackup':
						case 'OracleAccess':
						{
							result = getExtension('oracle').jobDetails()['backup'];
							break;
						}
						case 'SAPHANABackup':
						case 'SAPHANAAccess':
						{
							result = getExtension('saphana').jobDetails()['backup'];
							break;
						}
						default:
						{
							console.warn("Cannot display job progress - unhandled job class '%s'", handlerInfo.class);
							break;
						}
					}
					break;
				}
				case 'eJOBTYPE_OTHER':
				{
					switch (handlerInfo.class)
					{
						default:
						{
							console.warn("Cannot display job progress - unhandled job class '%s'", handlerInfo.class);
							break;
						}
					}
					break;
				}
				default:
				{
					console.debug("Cannot display job progress - unhandled job type");
					break;
				}
			}
		}
		else
		{
			console.debug("Cannot display job progress - job does not have handler information");
		}

		return result;
	}

	return JobController;
});
