/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Injector} from '../di/injector';
import {Type} from '../type';
import {stringify} from '../util';

import {ComponentFactory, ComponentRef} from './component_factory';
import {NgModuleRef} from './ng_module_factory';

export function noComponentFactoryError(component: Function) {
  const error = Error(
      `No component factory found for ${stringify(component)}. Did you add it to @NgModule.entryComponents?`);
  (error as any)[ERROR_COMPONENT] = component;
  return error;
}

const ERROR_COMPONENT = 'ngComponent';

export function getComponent(error: Error): Type<any> {
  return (error as any)[ERROR_COMPONENT];
}


class _NullComponentFactoryResolver implements ComponentFactoryResolver {
  resolveComponentFactory<T>(component: {new (...args: any[]): T}): ComponentFactory<T> {
    throw noComponentFactoryError(component);
  }
}

/**
 * @stable
 */
export abstract class ComponentFactoryResolver {
  static NULL: ComponentFactoryResolver = new _NullComponentFactoryResolver();
  abstract resolveComponentFactory<T>(component: Type<T>): ComponentFactory<T>;
}

export class CodegenComponentFactoryResolver implements ComponentFactoryResolver {
  private _factories = new Map<any, ComponentFactory<any>>();

  constructor(
      factories: ComponentFactory<any>[], private _parent: ComponentFactoryResolver,
      private _ngModule: NgModuleRef<any>) {
    for (let i = 0; i < factories.length; i++) {
      const factory = factories[i];
      this._factories.set(factory.componentType, factory);
    }
  }

  resolveComponentFactory<T>(component: {new (...args: any[]): T}): ComponentFactory<T> {
    let factory = this._factories.get(component) || this._parent.resolveComponentFactory(component);

    return new ComponentFactoryBoundToModule(factory, this._ngModule);
  }
}

export class ComponentFactoryBoundToModule<C> extends ComponentFactory<C> {
  constructor(private factory: ComponentFactory<C>, private ngModule: NgModuleRef<any>) { super(); }

  get selector() { return this.factory.selector; }
  get componentType() { return this.factory.componentType; }
  get ngContentSelectors() { return this.factory.ngContentSelectors; }
  get inputs() { return this.factory.inputs; }
  get outputs() { return this.factory.outputs; }

  create(
      injector: Injector, projectableNodes?: any[][], rootSelectorOrNode?: string|any,
      ngModule?: NgModuleRef<any>): ComponentRef<C> {
    return this.factory.create(
        injector, projectableNodes, rootSelectorOrNode, ngModule || this.ngModule);
  }
}
