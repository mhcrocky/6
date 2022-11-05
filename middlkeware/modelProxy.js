var mongoose = require('mongoose')
   ,Schema = mongoose.Schema
   ,ObjectId = Schema.ObjectId;

var clientSchema = new Schema({
    id: ObjectId,
    currentIp:{type:String},
    PORT: {type: Number},
    rangeStart: {type: Number},
});

module.exports = mongoose.model('clientdatas', clientSchema);