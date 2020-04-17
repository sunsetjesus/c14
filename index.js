const nodeRSA = require("node-rsa");
const fs      = require("fs-extra");
const crypto  = require("crypto");
const ffmpeg = require('ffmpeg');
const path = require("path");
const build_dir = path.join(__dirname,"./build/frames");
const node_rsa = require("node-rsa");
const filepay = require('filepay');


const protocol_prefix = "1tTm1SsDovUrtZryEusP1zfPpK5AvnMKM"



var asm = {
    
    init : function(opt){
                    let root = this;
                    let t = new Date().getTime();
                    let built_path = path.join(__dirname,"./build/"+t+"/frame");
        
                    fs.ensureDir(built_path,function(err){
                        if(err){
                            console.log(err)
                        }else{
                            root.build_dir = built_path;
                            root.key_rsa = new node_rsa(opt.key_rsa);
                            root.key_bsv = opt.key_bsv;
                        }
                    })
                    
        
    },
    
    prepare_media : function(path){
        
        let root = this;
        let obj_temp_0 = [];
        
        return new Promise(function(resovle,reject){
         
            var process = new ffmpeg(path); 
            process.then(function (video) {
                resovle(video)
            }, function (err) {
                reject('Error: ' + err)
                
            });
        })
        

           
        
    },
    
    create_frame_sig_hash : function(video_obj){
        let root = this;
        let f_b_sig_str = ""
        
        
        return new Promise(function(resolve,reject){
         
                video_obj.fnExtractFrameToJPG(root.build_dir, {
                            file_name : '__media__%s' 
                        }, function (error, files) {
                            if (!error){
                                files.map((file,index)=>{
                                    let frame_buffer = fs.readFileSync(file);
                                    let frame_buff_sig = root.key_rsa.sign(frame_buffer,"base64","base64");
                                    f_b_sig_str = (index<files.length-1)?f_b_sig_str+frame_buff_sig+"_$_":f_b_sig_str+frame_buff_sig;
                                })

                                let frame_buffer_sig_hash = crypto.createHash("sha256").update(f_b_sig_str).digest("base64");
                                let obj_temp_0 = {
                                    video_obj,frame_buffer_sig_hash
                                }
                                resolve(obj_temp_0);

                            }else{
                                reject(error)
                            }
                        })
            
        })
       

        
    },
    
    build_op_return_payload : function(data){
       
        
        let t_stamp = new Date().getTime();
        let root = this;

        data.video_obj.metadata.filename = t_stamp; 
        data.video_obj.metadata.frame_sig_hash = data.frame_buffer_sig_hash
        let metadata_sign = root.key_rsa.sign(Buffer.from(JSON.stringify(data.video_obj.metadata)),"base64","base64");
        let obj_temp_0 = {
            verson : "1.0.0",
            sig : metadata_sign,
            metadata : JSON.stringify(data.video_obj.metadata)

        };
        let op_return_str = protocol_prefix+" "+Buffer.from(JSON.stringify(obj_temp_0)).toString("base64");
        return(op_return_str)
        
        
    },
    op_return_push : function(op_return_payload){
        let root = this;
        
        return new Promise(function(resolve,reject){
            
            let tx = {
                safe: true,
                data: op_return_payload.split(" "),
                pay : {
                    key : root.key_bsv
                }
            }
            console.log("Broadcasting Transaction ...\n")
            filepay.send(tx,function(err,res){
                if(err){
                    reject(err)
                }else{
                    resolve(res)
                }
            })      
            
        })

        
    }
    
}

module.exports = asm;













