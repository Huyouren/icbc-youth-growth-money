(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./engine.js'):root.MoneyEngine);if(typeof module==='object'&&module.exports)module.exports=api;else root.MoneyCoach=api;})(globalThis,function(E){
'use strict';
const money=n=>'¥'+Number(n).toLocaleString('zh-CN');
const days=n=>n===null?'暂无法估算':n+'天';
const clone=x=>JSON.parse(JSON.stringify(x));
function create(){return {pending:null,lastPurchase:null};}
function signature(c){return JSON.stringify({plan:c.plan,version:c.version,confirmed:c.confirmed,sim:c.sim,reward:c.reward});}
function number(s){if(/^\d+(\.\d+)?$/.test(s))return Number(s);const n={零:0,一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};if(s in n)return n[s];if(/^[一二三四五六七八九]?十[一二三四五六七八九]?$/.test(s)){const a=s.split('十');return (a[0]?n[a[0]]:1)*10+(a[1]?n[a[1]]:0);}return null;}
function duration(s){const m=s.match(/(\d+(?:\.\d+)?|[一二两三四五六七八九十]+)\s*(天|周|星期)/);return m?number(m[1])*(m[2]==='天'?1:7):null;}
function price(s){const m=s.match(/(?:预算(?:改为|改成|降到|是|为)?|花|买|消费|价格(?:是|为)?)[^\d，。！？-]{0,10}(-?\d+(?:\.\d+)?)\s*(?:元|块)?/)||s.match(/(-?\d+(?:\.\d+)?)\s*(?:元|块)/)||s.match(/^\s*(-?\d+(?:\.\d+)?)\s*$/);return m?Number(m[1]):null;}
function respond(previous,text,context){
 const state=clone(previous||create()),s=text.trim(),c=clone(context),trace=[];
 const done=(reply,extra={})=>({state,reply,trace,...extra});
 const call=(name,input,fn)=>{const data=fn();trace.push({name,input,output:data});return data;};
 const p=call('read_plan',{},()=>c.plan);
 const choices=(q,values)=>done(q,{choices:values});
 if(!s)return done('说说这次想安排的事情。');
 if(/^(取消|算了|重新开始|清空任务)$/.test(s)){state.pending=null;state.lastPurchase=null;return done('已结束这次讨论。可以重新说一件想安排的事。');}
 if(/忽略.*(?:规则|限制|校验)|直接.*(?:转账|扣款|执行)|不用确认|绕过/.test(s))return done('我可以计算资金取舍。用途调整需要在规划页确认，当前演示没有转账或扣款能力。');
 const delayIntent=/延迟|延期|推迟|晚到|晚\d|晚[一二两三四五六七八九十]|收入.*(?:改为|改成|天后|周后)|结算.*(?:改为|改成)/.test(s);
 const purchaseIntent=/买|消费|球鞋|电脑|平板|预算/.test(s);
 if(delayIntent&&purchaseIntent){state.pending={kind:'delay'};return choices('先核对收入时间，再比较购买。下一笔收入是比原计划晚几天，还是改为从今天起多少天后？',['比原计划晚14天','改为21天后到账']);}
 if(/退款|自转账|自己.*转/.test(s)){state.pending=null;return done('这类金额需要先关联原交易。当前演示不能把退款或自己账户间的转入认定为新增收入；可先保留原用途安排。');}
 if(/到账|奖学金|兼职.*收入/.test(s)&&!delayIntent&&state.pending?.kind!=='delay'&&!purchaseIntent){state.pending=null;const future=/预计|还没|下周|将/.test(s);return done(future?'这笔收入尚未实际到账，只能作为预测条件。到账后再加入可分配资金。':'请在“到账规划”核对金额、来源和下笔收入时间。当前演示只调整同一笔收入，切换另一笔需重置演示。',future?{}:{action:{kind:'open_plan',label:'查看到账规划',snapshot:signature(c)}});}
 if(delayIntent||(state.pending?.kind==='delay'&&!purchaseIntent)){
  const n=duration(s);if(n===null){state.pending={kind:'delay'};return choices('请补充天数。是比原计划晚几天，还是改为从今天起多少天后到账？',['比原计划晚7天','改为28天后到账']);}
  if(/-\d|提前/.test(s)){state.pending={kind:'delay'};return done('请用正数说明新的到账时间，例如“改为7天后到账”。');}
  const absolute=/改为|改成|从今天|在.*(?:天|周|星期)后|(?:天|周|星期)后到账/.test(s)&&!/比原|再晚|延迟|延期|推迟/.test(s);
  const nextDays=absolute?n:p.nextDays+n;
  if(!Number.isInteger(nextDays)||nextDays<1||nextDays>90){state.pending={kind:'delay'};return done('当前演示支持距今天1至90天的整数日期，请重新填写。');}
  state.pending=null;
  const q=call('replan_income_date',{nextDays,amount:p.amount,reward:c.reward},()=>E.plan({amount:p.amount,nextDays,reward:c.reward??p.allocations.reward,growth:p.allocations.growth}));
  const gap=q.essentialGap;
  return done(`按${absolute?'新的到账时间':'原计划再延后'+n+'天'}，下一笔收入为${nextDays}天后。必要生活支出从${money(p.livingNeed)}变为${money(q.livingNeed)}。${gap?'本次收入仍不足，生活金缺口为'+money(gap)+'。':'重新分配后梦想金为'+money(q.balances.dream)+'。'}原方案保持不变，可先查看调整草稿。`,{card:{title:'收入时间调整',rows:[['原覆盖期',p.nextDays+'天'],['新覆盖期',nextDays+'天'],['生活需补',money(q.livingGap)],['未覆盖缺口',money(gap)]]},action:{kind:'stage_delay',nextDays,label:'查看调整草稿',snapshot:signature(c)}});
 }
 if(/生活金|为什么|为啥|怎么算/.test(s)&&!purchaseIntent){state.pending=null;return done(`未来${p.nextDays}天每天必要支出60元${p.nextDays>=7?'，加上第7天的900元费用':''}，需要${money(p.livingNeed)}。扣除已有生活金¥1,200，本次需补${money(p.livingGap)}。这些是当前演示参数，可在后续版本按个人支出调整。`,{card:{title:'计算依据',rows:[['生活覆盖',p.nextDays+'天'],['必要支出',money(p.livingNeed)],['已有生活金','¥1,200'],['本次需补',money(p.livingGap)]]}});}
 if(purchaseIntent||state.pending?.kind==='purchase'||(/^\s*\d+(?:\.\d+)?\s*(元|块)?\s*$/.test(s)&&state.lastPurchase)){
  const follow=state.pending?.kind==='purchase'?state.pending:(!purchaseIntent&&state.lastPurchase?state.lastPurchase:{});
  if(/\d+\s*(?:到|至|[-~—])\s*\d+/.test(s)){state.pending={kind:'purchase',item:s};return done('请先选一个具体购买金额，我会同时给出较低预算的对比。');}
  const amount=price(s)??follow.price;
  const item=purchaseIntent?s:(follow.item||s);
  if(amount===null||amount===undefined){state.pending={kind:'purchase',item};return done('准备花多少钱？直接回复金额即可，例如“2000元”。');}
  if(!Number.isInteger(amount)||amount<0||amount>100000){state.pending={kind:'purchase',item};return done('当前演示金额需为0至100000元的整数，请重新输入。正式账务会使用整数分保存。');}
  let useGrowth=/不(?:用|使用|动用).*成长金|不能.*成长金/.test(s)?false:/(?:可以|允许|同意|使用|动用).*成长金/.test(s)?true:follow.useGrowth;
  const educational=/电脑|课程|学习|考证|平板/.test(item);
  if(educational&&useGrowth===undefined){state.pending={kind:'purchase',price:amount,item};return choices(`预算是${money(amount)}。这次是否允许动用成长金？商品名称不能替你决定资金用途。`,['允许使用成长金','不用成长金']);}
  useGrowth=useGrowth===true;state.pending=null;state.lastPurchase={price:amount,item,useGrowth};
  const invalid=E.validate(p,p.allocations);if(invalid)return done('先处理生活覆盖问题：'+invalid,{action:{kind:'open_plan',label:'检查到账规划',snapshot:signature(c)}});
  const inputs={...c.sim,price:amount,useGrowth};
  const result=call('simulate_purchase',inputs,()=>E.simulate(p,inputs));
  const scheduled=call('schedule_purchase',inputs,()=>E.simulateScheduled(p,inputs));
  const alternatives=[{label:'当前预算',price:amount,weekly:inputs.weekly},{label:'预算降低25%',price:Math.round(amount*.75),weekly:0},{label:'每周额外留40元',price:amount,weekly:40}].map(a=>{const r=call('compare_purchase',{...inputs,price:a.price,weekly:a.weekly},()=>E.simulateScheduled(p,{...inputs,price:a.price,weekly:a.weekly}));return [a.label,r.shortfall?'资金差'+money(r.shortfall):days(r.afterDays)];});
  const reply=result.shortfall?`可用用途资金还差${money(result.shortfall)}。本次没有使用生活金或应急金，可以降低预算后重新比较。`:`本次消费${money(amount)}，使用奖励金${money(result.used.reward)}、成长金${money(result.used.growth)}、梦想金${money(result.used.dream)}。按约定投入日，目标由${days(scheduled.baseDays)}变为${days(scheduled.afterDays)}；日均近似为${days(result.afterDays)}。这些日期均取决于后续投入能否按时完成。`;
  return done(reply,{card:{title:'三个选择 按约定投入日测算',rows:alternatives,note:`首次于第30天存入${money(inputs.monthly)}，以后每30天一次；额外周存入从第7天开始。当前目标${money(inputs.target)}。${c.confirmed?'使用已确认用途。':'使用尚未确认的建议用途。'}每周多留40元需有相应可选支出空间。超过1095天仍未达成时显示暂无法估算。`},action:{kind:'stage_purchase',price:amount,useGrowth,label:'带入消费模拟',snapshot:signature(c)},result});
 }
 return choices('我可以帮你核对收入延期、比较一笔购买，或解释当前规划。可先说一件具体的事。',['我想买电脑','收入延期了','为什么先补生活金']);
}
return Object.freeze({create,respond,signature});
});
