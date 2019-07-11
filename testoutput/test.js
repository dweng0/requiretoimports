import SearchView from './shared/views/search';
import SearchController from './shared/controllers/search';
import NodeTypeSelector from './shared/autocomplete/views/nodetypeselector';
import template from './storage/templates/search.html';
const  test = () => {
	'use strict';

	
	
	
	

	const  storageNodeTypes = function() {
		let  nodeTypes = require('application')().getData('nodemanager:nodetypes');
		return nodeTypes.filter(function(item) {
			return item.get('category') === 'eSTORAGE' && !_.contains(['HCP'], item.get('id'));
		});
	};

	const  Controller = SearchController.extend({
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
}
export default test;
