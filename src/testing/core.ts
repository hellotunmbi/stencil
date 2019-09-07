import {
  ComponentDecorator,
  ElementDecorator,
  EventDecorator,
  ListenDecorator,
  PropDecorator,
  StateDecorator,
  WatchDecorator
} from '../declarations';


export {
  ComponentDidLoad,
  ComponentDidUnload,
  ComponentDidUpdate,
  ComponentWillLoad,
  ComponentWillUpdate,
  ComponentInterface,
  StencilConfig as Config,
  EventEmitter,
  FunctionalComponent,
  QueueApi,
  LocalJSX as JSX
} from '../declarations';

/**
 * Component
 */
export declare const Component: ComponentDecorator;

/**
 * Element
 */
export declare const Element: ElementDecorator;

/**
 * Event
 */
export declare const Event: EventDecorator;

/**
 * Listen
 */
export declare const Listen: ListenDecorator;

/**
 * Method
 */
export declare const Method: MethodDecorator;

/**
 * Prop
 */
export declare const Prop: PropDecorator;

/**
 * State
 */
export declare const State: StateDecorator;

/**
 * Watch
 */
export declare const Watch: WatchDecorator;

export * from './platform';
