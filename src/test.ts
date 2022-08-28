import {watch} from "@/index";
const [obj]=watch({
    test:'hello'
},(value,oldValue)=>{
    console.log('tttttt',value,oldValue)
})
obj['aaa']='bbb'
