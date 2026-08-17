const REACHOUT_URL='https://ta-reachout.netlify.app/s'

const bytesToBase64Url=bytes=>{
  const binary=Array.from(bytes,byte=>String.fromCharCode(byte)).join('')
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')
}

async function compress(bytes){
  if(!('CompressionStream' in globalThis))return{bytes,compression:'none'}
  const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
  return{bytes:new Uint8Array(await new Response(stream).arrayBuffer()),compression:'gzip'}
}

export async function createReachOutLink(people){
  const contacts=people.filter(person=>person.name?.trim()&&person.phone?.trim())
  if(!contacts.length)throw new Error('Add a phone number before opening ReachOut.')

  // This mirrors ReachOut's compact transfer schema. Templates are deliberately empty.
  const compact={
    c:contacts.map(person=>[person.name.trim(),person.phone.trim()]),
    t:[],n:[],ne:0,r:[0,'',[],0,'+44'],d:'+44',e:0,cn:0,
  }
  const encoded=new TextEncoder().encode(JSON.stringify({v:1,d:compact}))
  const compressed=await compress(encoded)
  const transfer={v:1,c:compressed.compression,d:bytesToBase64Url(compressed.bytes)}
  const token=bytesToBase64Url(new TextEncoder().encode(JSON.stringify(transfer)))
  // i=1 asks ReachOut to land on its Import contacts tab after accepting the payload.
  // Older ReachOut versions safely ignore the extra hash parameter.
  return`${REACHOUT_URL}#ro=${token}&i=1`
}
