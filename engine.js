(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MoneyEngine=api;})(globalThis,function(){
'use strict';
const BASE=Object.freeze({living:1200,safety:1000,growth:0,dream:1000,reward:0});
const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
function integer(n,min,max,name){if(!Number.isInteger(n)||n<min||n>max)throw new Error(name+'须为 '+min+' 至 '+max+' 之间的整数');}
function plan({amount=5000,nextDays=14,reward=500,growth=1000}={}){
integer(amount,1,100000,'到账金额');integer(nextDays,1,90,'到账天数');integer(reward,0,100000,'奖励预算');integer(growth,0,100000,'成长预算');
const livingNeed=60*nextDays+(nextDays>=7?900:0),livingGap=Math.max(0,livingNeed-BASE.living);let left=amount;const take=n=>{const v=Math.min(n,left);left-=v;return v;};
const allocations={living:take(livingGap),safety:take(500),reward:take(reward),growth:take(growth),dream:left};
const balances=Object.fromEntries(Object.keys(BASE).map(k=>[k,BASE[k]+allocations[k]]));return {amount,nextDays,allocations,balances,livingNeed,livingGap,safetyGap:Math.max(0,1500-balances.safety),essentialGap:Math.max(0,livingNeed-balances.living)};
}
function validate(p,a){if(Object.keys(BASE).some(k=>!Number.isInteger(a[k])||a[k]<0))return '请填写非负整数金额';if(sum(a)!==p.amount)return '分配合计需等于到账金额，当前相差 '+(p.amount-sum(a))+' 元';if(BASE.living+a.living<p.livingNeed)return '生活金还差 '+(p.livingNeed-BASE.living-a.living)+' 元，需先覆盖近期必要支出';return '';}
function apply(p,a){const error=validate(p,a);if(error)throw new Error(error);return {...p,allocations:{...a},balances:Object.fromEntries(Object.keys(BASE).map(k=>[k,BASE[k]+a[k]]))};}
function simulate(p,{price=2000,monthly=600,weekly=0,target=6000,goalDays=180,useGrowth=false}={}){
integer(price,0,100000,'消费金额');integer(monthly,0,600,'每月存入');integer(weekly,0,40,'每周调整');integer(target,1000,100000,'目标金额');integer(goalDays,1,1095,'目标天数');
let cost=price;const used={reward:Math.min(cost,p.balances.reward),growth:0,dream:0};cost-=used.reward;if(useGrowth){used.growth=Math.min(cost,p.balances.growth);cost-=used.growth;}used.dream=Math.min(cost,p.balances.dream);cost-=used.dream;
const baselineRate=monthly/30,rate=baselineRate+weekly/7,remaining=p.balances.dream-used.dream;const days=(balance,perDay)=>balance>=target?0:perDay>0?Math.ceil((target-balance)/perDay-1e-9):null;
const baseDays=days(p.balances.dream,baselineRate),afterDays=cost>0?null:days(remaining,rate);return {price,monthly,weekly,target,goalDays,useGrowth,used,remaining,shortfall:cost,baseDays,afterDays,delay:afterDays===null||baseDays===null?null:afterDays-baseDays,rate,baselineRate,onTime:afterDays!==null&&afterDays<=goalDays};
}
function simulateScheduled(p,input={}){const s=simulate(p,input);const reach=(balance,monthly,weekly)=>{if(balance>=s.target)return 0;for(let day=1;day<=1095;day++){if(day%30===0)balance+=monthly;if(day%7===0)balance+=weekly;if(balance>=s.target)return day;}return null;};const baseDays=reach(p.balances.dream,s.monthly,0),afterDays=s.shortfall?null:reach(s.remaining,s.monthly,s.weekly);return {...s,baseDays,afterDays,delay:baseDays===null||afterDays===null?null:afterDays-baseDays,onTime:afterDays!==null&&afterDays<=s.goalDays,timing:'每30天存入一次 第30天首次存入 每7天额外存入一次 第7天首次存入',horizonDays:1095};}
function cashflow(p,days=90){let cash=sum(BASE)+p.amount;const out=[{day:0,cash}];for(let day=1;day<=days;day++){cash-=60;if(day===7)cash-=900;if(day>=p.nextDays&&(day-p.nextDays)%30===0)cash+=2600;if(day%30===0)cash-=200;out.push({day,cash});}return out;}
return Object.freeze({BASE,sum,plan,validate,apply,simulate,simulateScheduled,cashflow});});
