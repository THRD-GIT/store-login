const { addStatsDataService } = require("../service/stats.service");



const addDataInStatsController = async(req,res)=>{
    try{
        const result = await addStatsDataService(req.body);
        if(!result.success){
            return res.status(400).json(result)
        }
        return res.status(200).json(result)

    }catch(error){
        console.log("error",error);
        return res.status(500).json({success:false,message:"Internal Server Error"})
    }
}


module.exports = {addDataInStatsController};