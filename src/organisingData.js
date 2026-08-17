export const ACTIVITY_TYPES = [
  {id:'conversation',label:'Organising conversation',group:'Contact',meaningful:true},
  {id:'one-to-one',label:'One-to-one',group:'Contact',meaningful:true},
  {id:'contact-attempt',label:'Contact attempted',group:'Contact',meaningful:false},
  {id:'meeting',label:'Attended meeting',group:'Participation',meaningful:true},
  {id:'action',label:'Attended action or demonstration',group:'Participation',meaningful:true},
  {id:'training',label:'Joined training',group:'Participation',meaningful:true},
  {id:'door-knock',label:'Took part in door knocking',group:'Participation',meaningful:true},
  {id:'task',label:'Completed an organising task',group:'Contribution',meaningful:true},
  {id:'brought-person',label:'Brought another person',group:'Contribution',meaningful:true},
  {id:'facilitated',label:'Facilitated or chaired',group:'Contribution',meaningful:true},
  {id:'could-not-attend',label:'Could not attend',group:'Non-participation',meaningful:false},
  {id:'no-response',label:'No response',group:'Non-participation',meaningful:false},
]

export const SEED_CAMPAIGNS = [
  {id:'repairs',name:'Damp & repairs',status:'active',description:'Winning repairs and a clear damp protocol across Ash Court and North Estate.',owner:'Leila'},
  {id:'service-charge',name:'Stop the service charge increase',status:'active',description:'Building tenant opposition to the proposed service-charge rise.',owner:'Sam'},
  {id:'lift',name:'Mill House lift campaign',status:'active',description:'Escalating the long-running lift failures at Mill House.',owner:'Leila'},
  {id:'winter',name:'Winter warmth campaign',status:'completed',description:'Previous campaign on heating outages and emergency support.',owner:'Sam'},
]

const activity = (id,personId,date,type,campaignId='',notes='',role='participant') => ({id,personId,date,type,campaignIds:campaignId?[campaignId]:[],structure:'Branch',role,notes,recordedBy:'Leila'})
export const SEED_ACTIVITIES = [
  activity('a1','p1','2026-08-14','facilitated','repairs','Chaired the action-planning section.','lead'),
  activity('a2','p2','2026-08-12','one-to-one','service-charge','Mapped the next three conversations.','lead'),
  activity('a3','p3','2026-08-09','door-knock','lift','Covered two floors and logged repairs.'),
  activity('a4','p4','2026-08-14','meeting','repairs','Took responsibility for the survey.'),
  activity('a5','p5','2026-06-02','conversation','service-charge','Strong interest but shift pattern is difficult.'),
  activity('a6','p6','2026-08-03','task','service-charge','Completed welcome calls.'),
  activity('a7','p7','2026-08-14','meeting','repairs','First campaign meeting; spoke about mould.'),
  activity('a8','p8','2026-07-20','meeting','lift','Joined after rent increase.'),
  activity('a9','p9','2026-05-05','conversation','service-charge','Trusted on landing; follow up in person.'),
  activity('a10','p10','2026-08-14','meeting','repairs','Helped on the sign-in desk.'),
  activity('a11','p11','2026-07-30','one-to-one','service-charge','Wants to develop confidence speaking.'),
  activity('a12','p12','2026-04-18','contact-attempt','service-charge','No answer; try evening.'),
  activity('a13','p13','2026-08-11','task','repairs','Booked accessible room.'),
  activity('a14','p14','2026-03-02','meeting','','New-member meeting.'),
  activity('a15','p15','2026-07-12','conversation','repairs','Interested in helping with photos.'),
  activity('a16','p16','2026-08-06','training','lift','Attended organising conversations training.'),
  activity('a17','p18','2026-07-01','conversation','service-charge','Prefers text because of evening work.'),
  activity('a18','p19','2026-05-19','action','lift','Joined lobby demonstration.'),
  activity('a19','p20','2026-08-09','brought-person','lift','Brought a neighbour from floor six.'),
  activity('a20','p22','2026-07-28','meeting','repairs','Well connected through the school.'),
  activity('a21','p24','2026-08-01','conversation','lift','Depot union experience may be useful.'),
  activity('a22','p25','2026-08-14','meeting','repairs','Took minutes and circulated actions.'),
  activity('a23','p1','2026-07-16','action','repairs','Led the repairs delegation.','lead'),
  activity('a24','p2','2026-07-16','brought-person','repairs','Brought two neighbours.','lead'),
  activity('a25','p4','2026-06-22','door-knock','repairs','Knocked every door on her floor.'),
]

export const SEED_FOLLOWUPS = [
  {id:'f1',personId:'p5',campaignId:'service-charge',assignedTo:'Sam',dueDate:'2026-08-15',purpose:'Campaign conversation',notes:'Catch Darren before his early shift.',status:'open'},
  {id:'f2',personId:'p9',campaignId:'service-charge',assignedTo:'Sam',dueDate:'2026-08-19',purpose:'Invite to meeting',notes:'Ask Fatima who else from her landing might come.',status:'open'},
  {id:'f3',personId:'p7',campaignId:'repairs',assignedTo:'Leila',dueDate:'2026-08-20',purpose:'Ask them to take a task',notes:'Offer the photo evidence task.',status:'open'},
  {id:'f4',personId:'p12',campaignId:'service-charge',assignedTo:'Sam',dueDate:'2026-08-13',purpose:'Try contact again',notes:'Evening is most likely.',status:'open'},
  {id:'f5',personId:'p19',campaignId:'lift',assignedTo:'Leila',dueDate:'2026-08-24',purpose:'Campaign conversation',notes:'Explore whether the football group will support.',status:'open'},
]

export const meaningfulActivity = a => ACTIVITY_TYPES.find(t=>t.id===a.type)?.meaningful
export const activityLabel = id => ACTIVITY_TYPES.find(t=>t.id===id)?.label || id
export const daysSince = date => Math.max(0,Math.floor((new Date()-new Date(`${date}T12:00:00`))/86400000))
export function lastEngagement(personId,activities){return activities.filter(a=>a.personId===personId&&meaningfulActivity(a)).sort((a,b)=>b.date.localeCompare(a.date))[0]||null}
