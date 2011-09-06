// doT.js
// 2011, Laura Doktorova
// https://github.com/olado/doT
//
// doT is a custom blend of templating functions from jQote2.js
// (jQuery plugin) by aefxx (http://aefxx.com/jquery-plugins/jqote2/)
// and underscore.js (http://documentcloud.github.com/underscore/)
// plus extensions.
//
// Licensed under the MIT license.
//
(function() {
	var doT = { version : '0.1.6' };

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = doT;
	} else {
		this.doT = doT;
	}

	doT.templateSettings = {
		evaluate:    /\{\{([\s\S]+?)\}\}/g,
		interpolate: /\{\{=([\s\S]+?)\}\}/g,
		encode:      /\{\{!([\s\S]+?)\}\}/g,
		use:         /\{\{#([\s\S]+?)\}\}/g, //compile time evaluation
		define:      /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g, //compile time defs
		defineFun:   /\{\[\s*([\w\.$]+)\s*:([\s\S]+?)]\}/g, //compile time defs using sub-template
		useFun:      /\{>([\s\S]+?):([\s\S]+?)\<\}/g, //compile time evaluation using sub-template
		varname: 'it',
		strip : true,
		append: true
	};

	function resolveDefs(c, block, def) {
		return ((typeof block === 'string') ? block : block.toString())
		.replace(c.define, function (match, code, assign, value) {
			if (code.indexOf('def.') === 0) {
				code = code.substring(4);
			}
			if (!(code in def)) {
				if (assign === ':') {
					def[code]= value;
				} else {
					eval("def[code]=" + value);
				}
			}
			return '';
		})
		.replace(c.use, function(match, code) {
			var v = eval(code);
			return v ? resolveDefs(c, v, def) : v;
		});
	}

	doT.template = function(tmpl, cs, def1) {
		var c = cs || doT.templateSettings;
		var cstart = c.append ? "'+(" : "';out+=(", // optimal choice depends on platform/size of templates
		    cend   = c.append ? ")+'" : ");out+='";
		def = def1 || {};
		var str = (c.use || c.define) ? resolveDefs(c, tmpl, def || {}) : tmpl;

		var fs = {};
		str = ("var out='" +
			((c.strip) ? str.replace(/\s*<!\[CDATA\[\s*|\s*\]\]>\s*|[\r\n\t]|(\/\*[\s\S]*?\*\/)/g, ''): str)
			.replace(/\\/g, '\\\\')
			.replace(c.defineFun, function(match, name, value) {
				fs[name] = doT.template(value, cs, def);
				return '';
			})
			.replace(/'/g, "\\'")
			.replace(c.interpolate, function(match, code) {
				return cstart + code.replace(/\\'/g, "'").replace(/\\\\/g,"\\").replace(/[\r\t\n]/g, ' ') + cend;
			})
			.replace(c.encode, function(match, code) {
				return cstart + code.replace(/\\'/g, "'").replace(/\\\\/g, "\\").replace(/[\r\t\n]/g, ' ') + ").toString().replace(/&(?!\\w+;)/g, '&#38;').split('<').join('&#60;').split('>').join('&#62;').split('" + '"' + "').join('&#34;').split(" + '"' + "'" + '"' + ").join('&#39;').split('/').join('&#47;'" + cend;
			})
			.replace(c.evaluate, function(match, code) {
				return "';" + code.replace(/\\'/g, "'").replace(/\\\\/g,"\\").replace(/[\r\t\n]/g, ' ') + "out+='";
			})
			+ "';return out;")
						.replace(c.useFun, function(match, fun, arg) {
				return cstart + 'fs.' + fun + '(' + arg + ')' + cend;
			})
			.replace(/\n/g, '\\n')
			.replace(/\t/g, '\\t')
			.replace(/\r/g, '\\r')
			.split("out+='';").join('')
			.split("var out='';out+=").join('var out=');

		try {
			var gen = new Function(c.varname, 'fs', str);
			str = "var f = function(x, fs) {if (x.constructor === Array) {var s = ''; for (var s = '', i = 0, l = x.length; i < l; ++i) s+= gen(x[i],fs); return s} return gen(x,fs);}; f";
			var fun =  eval(str);
			return function(arg) {return fun(arg, fs)};
		} catch (e) {
			if (typeof console !== 'undefined') console.log("Could not create a template function: " + str);
			throw e;
		}
	};
}());
