import {watch} from "@/index";
const [obj]=watch({
    test:'hello'
},{
    '*':(value,oldValue)=>{
        console.log('watch all',value,oldValue)
    },
    test(value,oldValue){
        console.log('watch test',value,oldValue)
    }
})
obj.test='hi'
