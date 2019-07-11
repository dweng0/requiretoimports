define(function(require) {
	'use strict';

	const SearchView = require('shared/views/search');
	const SearchController = require('shared/controllers/search');
	const NodeTypeSelector = require('shared/autocomplete/views/nodetypeselector');
	const template = require('tpl!storage/templates/search.html');

	const storageNodeTypes = function() {
		let nodeTypes = require('application')().getData('nodemanager:nodetypes');
		return nodeTypes.filter(function(item) {
			return item.get('category') === 'eSTORAGE' && !_.contains(['HCP'], item.get('id'));
		});
	};

	const Controller = SearchController.extend({
		initialize: function(options)
		{
			SearchController.prototype.initialize.call(this, options);
		},

		getQueryParameters: function(data)
		{
			if (!data.type)
			{
				// var storageNodesTypes = new StorageNodeTypes();
				data.type = _.map(storageNodeTypes(), function(model) { return model.get('id'); });
			}

			return data;
		}
	});

	return SearchView.extend(
	/**
	 * @lends Storage.Views.Search.prototype
	 */
	{
		template: template,

		regions: {
			nodeSelector: '#nodeselector'
		},

		controller: {
			controllerClass: Controller,
			live: true
		},

		initialize: function(options)
		{
			SearchView.prototype.initialize.call(this, options);
		},

		onRender: function()
		{
			this.showChildView('nodeSelector', new NodeTypeSelector({
				name: 'type',
				suggestions: new storageNodeTypes()
			}));
		}
	});
});
