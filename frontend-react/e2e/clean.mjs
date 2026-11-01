// Réservé au backend de recette fixé à 18080 par seed.mjs.
// Nettoie uniquement les tâches créées par les scénarios de cette suite.
import {api} from './seed.mjs';
const prefixes=['E2E angular ','E2E react ','Formulaire angular ','Formulaire react ','Planning angular ','Planning react ','Volume recette '];
for(const task of await api('tasks/priorities')) {
 if(prefixes.some(prefix=>task.title.startsWith(prefix))) await api(`tasks/${task.id}`,'DELETE');
}
