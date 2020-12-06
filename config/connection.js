const mongoClient= require('mongodb').MongoClient
const state= {
    db:null
};

module.exports.connect= (done) => {
    const url = "mongodb+srv://fayiz:YGM6tt17P0T0XyqF@cluster0.rqchu.mongodb.net/firstProject?retryWrites=true&w=majority";
    const dbname='firstProject';

    mongoClient.connect(url,(err,data) => {
        if(err) return done(err);
        state.db=data.db(dbname); 
        done();
    })
}

module.exports.get=function(){
    return state.db;
}