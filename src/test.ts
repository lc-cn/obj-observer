import {watch} from "@/index";
const [obj]=watch({
    test:'hello'
},(value,oldValue)=>{
    console.log('tttttt',value,oldValue)
})
obj['aaa']='bbb'
console.log(1)
obj['ccc']=[]
console.log(2)
