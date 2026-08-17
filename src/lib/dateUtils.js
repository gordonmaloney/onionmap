export const todayISO=()=>new Date().toISOString().slice(0,10)
export const addDaysISO=(date,days)=>{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}
export const isOverdue=date=>Boolean(date&&date<todayISO())
export const isDueWithin=(date,days=7)=>Boolean(date&&date>=todayISO()&&date<=addDaysISO(todayISO(),days))
export const formatShortDate=date=>new Date(`${date}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short'})
