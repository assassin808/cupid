import pymongo
from bson.objectid import ObjectId
class dbClient:
    def __init__(self):
        self.myclient = pymongo.MongoClient("mongodb+srv://heisen:heisenmongodb@cluster0.zc7ly8d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
        self.mydb = self.myclient["App_data"]
    def getCollection(self, collectionName):
        return self.mydb[collectionName]