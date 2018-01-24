import develop from './develop';
import release from './release';

export default function start(config, args, env = process.env) {
  return env.NODE_ENV === 'production' ?  // TODO: Other ways to enter production mode?
    release(...arguments) :
    develop(...arguments);
}
