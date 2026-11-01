import { chromium } from '@playwright/test';
import {api} from './seed.mjs';
import fs from 'node:fs/promises';
const docs=new URL('../../docs/', import.meta.url);
const ids=[]; const measurements=[];
const browser=await chromium.launch();
try {
  for(let i=0;i<120;i++) {
    const t=await api('tasks','POST',{title:`Volume recette ${String(i+1).padStart(3,'0')}`,quadrant:`Q${i%4+1}`,plannedEndAt:`2026-11-${String(1+i%28).padStart(2,'0')}T12:00:00Z`,estimatedMinutes:25});ids.push(t.id);
  }
  await api('settings','PATCH',{theme:'DARK'});
  for(const [framework,port] of [['angular',4200],['react',5173]]) {
    const page=await browser.newPage({viewport:{width:1440,height:900},locale:'fr-FR',timezoneId:'Europe/Paris'});
    for(const [name,route] of [['matrice','/matrix'],['calendrier','/calendar']]) {
      for(let sample=1;sample<=3;sample++) {
        const start=performance.now();await page.goto(`http://127.0.0.1:${port}${route}`);await page.waitForLoadState('networkidle');
        measurements.push({framework,route,sample,readyIncludingNetworkIdleMs:Math.round(performance.now()-start),...await page.evaluate(()=>{const p=performance.getEntriesByType('navigation')[0];return {domContentLoadedMs:Math.round(p.domContentLoadedEventEnd),loadMs:Math.round(p.loadEventEnd),domElements:document.querySelectorAll('*').length};})});
      }
      await page.screenshot({path:new URL(`screenshots/${framework}-${name}-volume-1440.png`,docs).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});
    }
    await page.setViewportSize({width:390,height:844});
    for(const [name,route] of [['tableau-de-bord','/'],['matrice','/matrix'],['mes-taches','/tasks'],['focus-pomodoro','/focus'],['calendrier','/calendar'],['statistiques','/statistics'],['projets','/projects']]) {
      await page.goto(`http://127.0.0.1:${port}${route}`);await page.waitForLoadState('networkidle');
      if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)) throw new Error(`${framework} ${route} dépasse 390px`);
      await page.screenshot({path:new URL(`screenshots/${framework}-${name}-volume-390.png`,docs).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});
    }
    await page.close();
  }
  await fs.writeFile(new URL('test-results/volume-performance.json',docs),JSON.stringify({date:new Date().toISOString(),additionalTasks:120,measurements},null,2));
  console.log('Volume : 120 tâches supplémentaires, 18 captures, 12 mesures, aucun débordement horizontal.');
} finally {
  await browser.close();
  for(const id of ids) await api(`tasks/${id}`,'DELETE');
}
