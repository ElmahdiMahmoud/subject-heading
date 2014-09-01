"use strict"

var express = require('express'),
    path = require('path'),
    mongo = require('mongoskin'),
    _ = require('underscore');

var app = express();
var db = mongo.db('localhost:27017/subject-heading', { safe: true });

app.configure(function() {
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.static(path.join(__dirname, 'public')));
});

app.listen(app.get('port'));

function roots(search, callback) {
    var pattern = new RegExp('.*' + search + '.*');
    var find = { name: pattern };
    var ids = [];
    db.collection('terms').find(find).toArray(function(err, terms) {
        _.each(terms, function(term) {
            if (term.path) {
                ids.push(_.first(_.compact(term.path.split(','))));
            } else {
                ids.push(term._id + '');
            }
        });
        ids = _.map(_.uniq(ids), function(id) {
            return db.ObjectID.createFromHexString(id)
        });
        callback(ids);
    });
}

function deep(obj, term) {
    var parts = _.compact(term.path.split(','));
    _.each(parts, function(part) {
        obj[part] = obj[part] || {};
        obj[part].children = obj[part].children || {};
        obj = obj[part].children;
    });
    obj[term._id] = term;
}

function pick(source) {
    var data = _.pick(source, 'name', 'pages');
    data.pages = _.map(data.pages.split(','), function(page) { 
        return parseInt(page, 10);
    });
    data.cased = data.name;
    data.name = data.name.toLowerCase();
    return data;
}


app.get('/', function(req, res) {

    var defaults = {
        display: 'nested',
        sort: 'alphabet/asc',
        search: ''
    };

    var filter = _.extend({}, defaults, _.pick(req.query, 'sort', 'display', 'search'));

    var sort = { path: 1 };

    var parts = filter.sort.split('/'),
        order = (parts[1] === 'desc') ? -1 : 1;
    if (parts[0] === 'alphabet') {
        _.extend(sort, { name: order });
    } else if (parts[0] === 'page') {
        _.extend(sort, { pages: order });
    }
    var plain = (filter.display === 'plain') ? true : false;
    if (plain) {
        delete sort.path;
    }

    var process = function(ids) {
        var find = (ids && ids.length) 
            ?   { 
                    '$or': [
                        { _id: { '$in': ids } },
                        { path: new RegExp('^,(' + ids.join('|') + ')') } 
                    ] 
                } 
            : {};
        db.collection('terms').find(find).sort(sort).toArray(function (err, terms) {
            if(err) throw err;
            var result = {};

            _.each(terms, function(term) {
                if ( ! term.path || plain) {
                    result[term._id] = term;
                } else {
                    deep(result, term);
                }
            });

            res.render('index', {
                terms: result,
                filter: filter
            });
        });
    };
    if (filter.search) {
        roots(filter.search, process);
    } else {
        process();
    }
    
});

app.post('/add_root', function(req, res) {
    var data = pick(req.body);
    db.collection('terms').insert(data, function(err, term) {
        if (err) throw err;
        res.json({ result: _.first(term) });    
    });
});

app.post('/edit', function(req, res) {
    var data = pick(req.body);
    var id = db.ObjectID.createFromHexString(req.body.id);    
    db.collection('terms').update({ _id: id }, { '$set' : data }, function(err, term) {
        if (err) throw err;
        if ( ! term) throw new Error('Not saved');
        res.json({ result: data });
    });
});

app.post('/delete', function(req, res) {
    var id = req.body.id,
        idObj = db.ObjectID.createFromHexString(id);
    db.collection('terms').remove(
        {   
            '$or' : 
            [
                { _id: idObj },
                { path: new RegExp(',' + id + '') }
            ] 
        }, 
        function(err, term) {
            if (err) throw err;
            res.json({ result: term });
        }
    );
});

app.post('/add_sub', function(req, res) {
    var data = pick(req.body);
    var parentId = req.body.parent_id,
        parentIdObj = db.ObjectID.createFromHexString(parentId);
    db.collection('terms').findById(parentIdObj, function(err, term) {
        var path = term.path || '';

        path += ',' + parentId;

        _.extend(data, { path: path });

        db.collection('terms').insert(data, function(err, term) {
            if (err) throw err;
            res.json({ result: _.first(term) });
        });


    });
});