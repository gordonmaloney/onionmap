export const SESSION_KEY='onionmap.session'
export const BACKUP_KEY='onionmap.session.backup'
export const SCHEMA_VERSION=2

export function loadSession(fallbacks){
  try{
    const current=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')
    if(current?.schemaVersion===SCHEMA_VERSION)return current
    const legacyPeople=JSON.parse(localStorage.getItem('tenantact-onionmap-v1')||'null')
    return {schemaVersion:SCHEMA_VERSION,people:legacyPeople||fallbacks.people,campaigns:JSON.parse(localStorage.getItem('onionmap.campaigns')||'null')||fallbacks.campaigns,activities:JSON.parse(localStorage.getItem('onionmap.activities')||'null')||fallbacks.activities,followups:JSON.parse(localStorage.getItem('onionmap.followups')||'null')||fallbacks.followups,settings:{}}
  }catch{return{schemaVersion:SCHEMA_VERSION,...fallbacks,settings:{}}}
}
export function saveSession(data){localStorage.setItem(SESSION_KEY,JSON.stringify({schemaVersion:SCHEMA_VERSION,...data}))}
export function backupSession(data){localStorage.setItem(BACKUP_KEY,JSON.stringify({schemaVersion:SCHEMA_VERSION,...data,backedUpAt:new Date().toISOString()}))}
export function restoreBackup(){try{return JSON.parse(localStorage.getItem(BACKUP_KEY)||'null')}catch{return null}}
