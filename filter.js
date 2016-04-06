// Filter unwanted properties out of an object given an array of valid properties
var filterProps = function filterProps (dirtyObj, validPropArray, objNum) {
	try {
		// Only works one object down eg. { prop1: 'prop', prop2: { objprop1: 'prop' } }
		// @param dirtyObj - the object to filter
		// @param validPropArray - array of valid properties for each object 
		// eg. [ ["OriginalObjprop1", "OriginalObjprop2"], ["SubObjprop1", "SubObjprop2"], ... ]
		if (!validPropArray) {
			throw new Error('Must specifiy valid properties to check for');
		}
		if (!Array.isArray(validPropArray)) {
			throw new TypeError('Invalid validPropArray paramater for Object number ' + (objNum || 0));
		} 
		if (typeof objNum === 'undefined') {
			var objNum = 0;
			if (Array.isArray(validPropArray[0])) {
				var originalPropArray = validPropArray;
				validPropArray = validPropArray[objNum];
			}
		}
		// Do some validation
		if (typeof dirtyObj !== 'object' && !Array.isArray(dirtyObj)) {
			throw new TypeError('First paramater must be an object');
		}
		
		// Do the filtering
		var cleanObj = {};
		Object.keys(dirtyObj).forEach(function (prop) {
			validPropArray.forEach(function (validProp) {
				if (prop === validProp) {
					if (typeof dirtyObj[prop] === 'boolean' || typeof dirtyObj[prop] === 'number') {
						cleanObj[prop] = dirtyObj[prop];
					}
					else if (typeof dirtyObj[prop] === 'string') {
						// CHANGE REGEX HERE
						cleanObj[prop] = dirtyObj[prop].trim().replace(/[<()>"']/g, '*');
					}
					else if (typeof dirtyObj[prop] === 'object') {
						if (Array.isArray(dirtyObj[prop])) {
							cleanObj[prop] = filterArray(dirtyObj[prop]);
						}
						else {
							try {
								if (Array.isArray(originalPropArray[objNum + 1])) {
									cleanObj[prop] = filterProps(dirtyObj[prop], originalPropArray[objNum + 1], ++objNum);
								}
							}
							catch (e) {
								throw new Error('If there are Objects within the first Object you must specifiy valid ' +
									'properties for each object. eg. [ ["prop1", "prop2"], ["Obj2prop1", "Obj2prop2"], ... ].');
							}
						}
					}
					else {
						console.log("Oops didn't match anything.....");
					}
				}
			});
		});
		return cleanObj;
	}
	catch (e) {
		console.warn(e);
		return undefined;
	}
}

// Filter array string values with custom replacer regex
var filterArray  = function filterArray (array) {
	for (var index = 0; index < array.length; index++) {
		if (typeof array[index] === 'string') {
			// CHANGE REGEX HERE
			array[index] = array[index].trim().replace(/[<()>"']/g, '*');
		}
		else if (Array.isArray(array[index])) {
			array[index] = filterArray(array[index]);
		}
		else {
			array[index] = array[index];
		}
	}
	return array;
}

module.exports.filterArray = filterArray;
module.exports.filterProps = filterProps;