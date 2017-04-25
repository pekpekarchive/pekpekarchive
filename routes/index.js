const express = require('express');
const router = express.Router();
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const url = process.env.MONGO_URI || require('../configs').MONGO_URI;
const collection = 'picbook';
const moment = require('moment');
const uuidV4 = require('uuid/v4');

const filePath = './public/images/';

let formatData = function (picData, filename){
	picData.filename = filename;
	picData.datetime = {num: Date.now(), text: moment().format('MMMM Do YYYY, h:mm:ss a')};
	return picData;
};

let formatResult = function(result){
	result = result.map(function(pic){
		pic.datetime.relative = moment(pic.datetime.text, 'MMMM Do YYYY, h:mm:ss a').fromNow();
		if(pic.comments){
			pic.comments = pic.comments.map(function(comment){
				comment.datetime.relative = moment(pic.datetime.text, 'MMMM Do YYYY, h:mm:ss a').fromNow()
				return comment;
			});
		}
		return pic;
	});

	return result;
};

MongoClient.connect(url, (err, db) => {
	if (err) return console.log(err);

	router.get('/', function(req, res, next) {
	  	db.collection(collection).find().sort( { "datetime": -1 } ).toArray((err, result) => {
		    if (err) return console.log(err);
		    
		    result = formatResult(result);
		    res.render('index', {pics: result});
		});
	});

	router.post('/', function(req, res, next) {
		if (!req.files) return res.status(400).send('No files were uploaded.');

		let uploadFile = req.files.pic;
		let filename = uuidV4() + '.jpg';

		uploadFile.mv(filePath + filename , function(err) {
		    if (err) return res.status(500).send(err);
		});

	  	let picData = formatData(req.body, filename);

		db.collection(collection).save(picData, (err, result) => {
	   	 	if (err) return console.log(err);
	    	res.redirect('/');
	  	});
	});

	router.post('/comment/:id', function(req, res, next) {
		var id = req.params.id;
		req.body.datetime = {num: Date.now(), text: moment().format('MMMM Do YYYY, h:mm:ss a')};

		db.collection(collection).replaceOne(
			{ '_id': new ObjectId(id) },
			{ $push: {'comments': req.body} },
			(err, result) => {
	   	 	if (err) return console.log(err);
	    	res.redirect('/');
	  	});
	});
});

module.exports = router;
