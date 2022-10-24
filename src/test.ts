import {ref, watch} from "@/index";
const obj=ref({
    test:'hello',
    a:{b:'a'}
})
const dispose=watch(obj,{
    '*':(val,oldVal)=>{
        console.log('obj changed ',val,oldVal)
    },
    a(val,oldVal){
        console.log('a changed ',val,oldVal)
    },
    test(val,oldVal){
        console.log('test changed ',val,oldVal)
    }
})
obj.a ={b:'aa'}
obj.test='hi'
