/**
 * Copyright 2014 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

///<reference path='../references.ts' />

module Shumway.AVM1.Lib {
  import notImplemented = Shumway.Debug.notImplemented;
  import somewhatImplemented = Shumway.Debug.somewhatImplemented;
  import assert = Shumway.Debug.assert;

  import flash = Shumway.AVMX.AS.flash; // REDUX remove

  var _escape: (str: string) => string = jsGlobal.escape;

  var _internalTimeouts: number[] = [];

  export class AVM1Globals extends AVM1Object {
    public static createGlobalsObject(context: AVM1Context): AVM1Globals {
      var globals = new AVM1Globals(context);
      wrapAVM1NativeMembers(context, globals, globals,
        ['flash', 'ASSetPropFlags', 'clearInterval', 'clearTimeout',
          'escape', 'unescape', 'setInterval', 'setTimeout', 'showRedrawRegions',
          'trace', 'updateAfterEvent',
          'NaN', 'Infinity', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'undefined',
          'Object', 'Function','Array', 'Number', 'Math', 'Boolean', 'Date', 'String',
          'MovieClip', 'AsBroadcaster', 'System', 'Stage', 'Button',
          'TextField', 'Color', 'Key', 'Mouse', 'MovieClipLoader',
          'Sound', 'SharedObject', 'ContextMenu', 'ContextMenuItem', 'TextFormat'], false);
      return globals;
    }

    constructor(context: AVM1Context) {
      super(context);

      this._initBuiltins(context);

      var swfVersion = context.loaderInfo.swfVersion;
      if (swfVersion >= 8) {
        this._initializeFlashObject(context);
      }
    }

    public flash: AVM1Object;

    public ASSetPropFlags(obj: any, children: any, flags: any, allowFalse: any): any {
      // flags (from bit 0): dontenum, dontdelete, readonly, ....
      // TODO
    }

    public clearInterval(id: number /* uint */): void {
      var internalId = _internalTimeouts[id - 1];
      if (internalId) {
        clearInterval(internalId);
        delete _internalTimeouts[id - 1];
      }
    }

    public clearTimeout(id: number /* uint */): void {
      var internalId = _internalTimeouts[id - 1];
      if (internalId) {
        clearTimeout(internalId);
        delete _internalTimeouts[id - 1];
      }
    }

    /**
     * AVM1 escapes slightly more characters than JS's encodeURIComponent, and even more than
     * the deprecated JS version of escape. That leaves no other option but to do manual post-
     * processing of the encoded result. :/
     *
     * Luckily, unescape isn't thus afflicted - it happily unescapes all the additional things
     * we escape here.
     */
    public escape(str: string): string {
      var result = encodeURIComponent(str);
      return result.replace(/!|'|\(|\)|\*|-|\.|_|~/g, function(char: string): string {
        switch (char) {
          case '*':
            return '%2A';
          case '-':
            return '%2D';
          case '.':
            return '%2E';
          case '_':
            return '%5F';
          default:
            return _escape(char);
        }
      });
    }

    public unescape(str: string): string {
      return decodeURIComponent(str);
    }

    public setInterval(): any {
      // AVM1 setInterval silently swallows everything that vaguely looks like an error.
      if (arguments.length < 2) {
        return undefined;
      }
      var args: any[] = [];
      if (alIsFunction(arguments[0])) {
        var fn: AVM1Function = arguments[0];
        args.push(fn.toJSFunction(), arguments[1]);
      } else {
        if (arguments.length < 3) {
          return undefined;
        }
        var obj: any = arguments[0];
        var funName: any = arguments[1];
        if (!(obj && typeof obj === 'object' && typeof funName === 'string')) {
          return undefined;
        }
        args.push(function () {
          // TODO add AVM1 property resolution (and case ignore)
          alCallProperty(obj, funName, Array.prototype.slice.call(arguments, 0));
        });
      }
      for (var i = 2; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      // Unconditionally coerce interval to int, as one would do.
      args[1] = alToInteger(this.context, args[1]);
      var internalId = setInterval.apply(null, args);
      return _internalTimeouts.push(internalId);
    }

    public setTimeout() {
      // AVM1 setTimeout silently swallows most things that vaguely look like errors.
      if (arguments.length < 2 || !alIsFunction(arguments[0])) {
        return undefined;
      }
      var args: any[] = [];
      var fn: AVM1Function = arguments[0];
      args.push(fn.toJSFunction());
      // Unconditionally coerce interval to int, as one would do.
      args.push(alToInteger(this.context, arguments[1]));
      for (var i = 2; i < arguments.length; i++) {
        args.push(arguments[i]);
      }

      var internalId = setTimeout.apply(null, args);
      return _internalTimeouts.push(internalId);
    }

    public showRedrawRegions(enable, color) {
      // flash.profiler.showRedrawRegions.apply(null, arguments);
      notImplemented('AVM1Globals.showRedrawRegions');
    }

    public trace(expression: any): any {
      (<any>this.context).actions.trace(expression);
    }

    public updateAfterEvent() {
      // flash.events.TimerEvent.updateAfterEvent
      somewhatImplemented('AVM1Globals.updateAfterEvent');
    }

    // built-ins
    public NaN: number = Number.NaN;
    public Infinity: number = Number.POSITIVE_INFINITY;
    public isFinite(n: number): boolean {
      return isFinite(alToNumber(this.context, n));
    }
    public isNaN(n: number): boolean {
      return isNaN(alToNumber(this.context, n));
    }
    public parseFloat(s: string): number {
      return parseFloat(alToString(this.context, s));
    }
    public parseInt(s: string, radix?: number): number {
      return parseInt(alToString(this.context, s), alToInt32(this.context, radix));
    }
    public undefined: any = undefined;

    public Object: AVM1Object;
    public Function: AVM1Object;
    public Array: AVM1Object;
    public Number: AVM1Object;
    public Math: AVM1Object;
    public Boolean: AVM1Object;
    public Date: AVM1Object;
    public String: AVM1Object;

    public MovieClip: AVM1Object;
    public AsBroadcaster: AVM1Object;
    public System: AVM1Object;
    public Stage: AVM1Object;
    public Button: AVM1Object;
    public TextField: AVM1Object;
    public Color: AVM1Object;
    public Key: AVM1Object;
    public Mouse: AVM1Object;
    public MovieClipLoader: AVM1Object;

    public Sound: AVM1Object;
    public SharedObject: AVM1Object;
    public ContextMenu: AVM1Object;
    public ContextMenuItem: AVM1Object;
    public TextFormat: AVM1Object;

    private _initBuiltins(context: AVM1Context) {
      var builtins = context.builtins;

      this.Object = builtins.Object;
      this.Function = builtins.Function;
      this.Array = builtins.Array;
      this.Number = builtins.Number;
      this.Math = builtins.Math;
      this.Boolean = builtins.Boolean;
      this.Date = builtins.Date;
      this.String = builtins.String;

      this.MovieClip = AVM1MovieClip.createAVM1Class(context);
      this.AsBroadcaster = AVM1Broadcaster.createAVM1Class(context);
      this.System = AVM1System.createAVM1Class(context);
      this.Stage = AVM1Stage.createAVM1Class(context);
      this.Button = AVM1Button.createAVM1Class(context);
      this.TextField = AVM1TextField.createAVM1Class(context);
      this.Color = AVM1Color.createAVM1Class(context);
      this.Key = AVM1Key.createAVM1Class(context);
      this.Mouse = AVM1Mouse.createAVM1Class(context);
      this.MovieClipLoader = AVM1MovieClipLoader.createAVM1Class(context);

      this.Sound = AVM1Sound.createAVM1Class(context);
      this.SharedObject = new AVM1SharedObjectFunction(context);
      this.ContextMenu = undefined; // wrapAVM1Builtin(sec.flash.ui.ContextMenu.axClass);
      this.ContextMenuItem = undefined; // wrapAVM1Builtin(sec.flash.ui.ContextMenuItem.axClass);
      this.TextFormat = AVM1TextFormat.createAVM1Class(context);

      AVM1Broadcaster.initialize(context, this.Stage);
      AVM1Broadcaster.initialize(context, this.Key);
      AVM1Broadcaster.initialize(context, this.Mouse);
    }

    private _initializeFlashObject(context: AVM1Context): void {
      this.flash = alNewObject(context);
      var display: AVM1Object = alNewObject(context);
      display.alPut('BitmapData', AVM1BitmapData.createAVM1Class(context));
      this.flash.alPut('display', display);
      var external: AVM1Object = alNewObject(context);
      external.alPut('ExternalInterface', AVM1ExternalInterface.createAVM1Class(context));
      this.flash.alPut('external', external);
      var filters: AVM1Object = alNewObject(context);
      this.flash.alPut('filters', filters);
      var geom: AVM1Object = alNewObject(context);
      geom.alPut('ColorTransform', new AVM1ColorTransformFunction(context));
      //geom.axSetPublicProperty('Matrix', wrapAVM1Builtin(sec.flash.geom.Matrix.axClass));
      geom.alPut('Point', new AVM1PointFunction(context));
      geom.alPut('Rectangle', new AVM1RectangleFunction(context));
      geom.alPut('Transform', AVM1Transform.createAVM1Class(context));
      this.flash.alPut('geom', geom);
      var text: AVM1Object = alNewObject(context);
      this.flash.alPut('text', text);
    }
  }

  export class AVM1NativeActions {
    public constructor(public context: AVM1Context) {
      // TODO ?
    }

    public asfunction(link) {
      notImplemented('AVM1Globals.$asfunction');
    }

    public call(frame) {
      var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context);
      var as3Object = nativeTarget.as3Object;
      var frameNum = as3Object._getAbsFrameNumber(<any>frame, null);
      if (frameNum === undefined) {
        return;
      }
      as3Object.callFrame(frameNum);
    }

    public chr(code) {
      code = alToInteger(this.context, code);
      if (this.context.swfVersion <= 5) {
        code &= 0xFF;
      }
      return code ? String.fromCharCode(code) : '';
    }

    public duplicateMovieClip(target, newname, depth) {
      var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context, target);
      nativeTarget.duplicateMovieClip(newname, depth, null);
    }

    public fscommand(command: string, args?: string) {
      return this.context.sec.flash.system.fscommand.axCall(null, this.context.sec, command, args);
    }

    public getTimer(): number {
      return Shumway.AVMX.AS.FlashUtilScript_getTimer(this.context.sec);
    }

    public getURL(url, target?, method?) {
      var sec = this.context.sec;
      var request = new sec.flash.net.URLRequest(String(url));
      if (method) {
        request.method = method;
      }
      if (typeof target === 'string' && target.indexOf('_level') === 0) {
        this.loadMovieNum(url, +target.substr(6), method);
        return;
      }
      Shumway.AVMX.AS.FlashNetScript_navigateToURL(sec, request, target);
    }

    _addToPendingScripts(subject: any, fn: Function, args: any [] = null): any {
      release || assert(fn, 'invalid function in _addToPendingScripts');
      var currentContext = this.context;
      var defaultTarget = currentContext.resolveTarget(undefined);
      currentContext.addToPendingScripts(function () {
        try {
          fn.apply(subject, args);
        } catch (ex) {
          console.error('AVM1 pending script error: ' + ex.message);
        }
      }, defaultTarget);
    }

    public gotoAndPlay(scene, frame?) {
      var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context);
      if (arguments.length < 2) {
        this._addToPendingScripts(nativeTarget, nativeTarget.gotoAndPlay, [arguments[0]]);
      } else {
        this._addToPendingScripts(nativeTarget, nativeTarget.gotoAndPlay, [arguments[1], arguments[0]]); // scene and frame are swapped for AS3
      }
    }

    public gotoAndStop(scene, frame?) {
      var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context);
      if (arguments.length < 2) {
        this._addToPendingScripts(nativeTarget, nativeTarget.gotoAndStop, [arguments[0]]);
      } else {
        this._addToPendingScripts(nativeTarget, nativeTarget.gotoAndStop, [arguments[1], arguments[0]]); // scene and frame are swapped for AS3
      }
    }

    public ifFrameLoaded(scene, frame?) {
      // ignoring scene parameter ?
      var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context);
      var frameNum = arguments.length < 2 ? arguments[0] : arguments[1];
      var framesLoaded = nativeTarget.alGet('_framesloaded');
      var totalFrames = nativeTarget.alGet('_totalframes');
      // The (0-based) requested frame index is clamped to (the 1-based) totalFrames value.
      // I.e., asking if frame 20 is loaded in a timline with only 10 frames returns true if all
      // frames have been loaded.
      return Math.min(frameNum + 1, totalFrames) <= framesLoaded;
    }

    public int(value: any): number {
      return value | 0;
    }

    public length_(expression): number {
      return ('' + expression).length; // ASCII Only?
    }

    public loadMovie(url: string, target: any, method: string): void {
      // some swfs are using loadMovie to call fscommmand
      if (url && url.toLowerCase().indexOf('fscommand:') === 0) {
        this.fscommand(url.substring('fscommand:'.length), target);
        return;
      }
      var loadLevel: boolean = typeof target === 'string' &&
        target.indexOf('_level') === 0;
      var levelNumber: number;
      if (loadLevel) {
        var levelStr: string = target.charAt(6);
        levelNumber = parseInt(levelStr, 10);
        loadLevel = levelNumber.toString() === levelStr;
      }
      var loader: flash.display.Loader = new this.context.sec.flash.display.Loader();
      if (loadLevel) {
        this._setLevel(levelNumber, loader);
        var request: flash.net.URLRequest = new this.context.sec.flash.net.URLRequest(url);
        if (method) {
          request.method = method;
        }
        loader.load(request);
      } else {
        var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context, target);
        nativeTarget.loadMovie(url, method);
      }
    }

    _setLevel(level: number /*uint*/, loader: flash.display.Loader): any {
      level = level >>> 0;
      // TODO: re-enable support for loading AVM1 content into levels. See bug 1035166.
      //AVM1Context.instance.stage._as2SetLevel(level, loader);
    }

    public loadMovieNum(url, level, method) {
      // some swfs are using loadMovieNum to call fscommmand
      if (url && url.toLowerCase().indexOf('fscommand:') === 0) {
        return this.fscommand(url.substring('fscommand:'.length));
      }

      var loader: flash.display.Loader = new this.context.sec.flash.display.Loader();
      this._setLevel(level, loader);
      var request = new this.context.sec.flash.net.URLRequest(url);
      if (method) {
        request.method = method;
      }
      loader.load(request);
    }

    public loadVariables(url: string, target: any, method: string = ''): void {
      var nativeTarget = AVM1Utils.resolveTarget(this.context, target);
      this._loadVariables(nativeTarget, url, method);
    }

    public loadVariablesNum(url: string, level: number, method: string = ''): void {
      var nativeTarget = AVM1Utils.resolveLevel(this.context, level);
      this._loadVariables(nativeTarget, url, method);
    }

    _loadVariables(nativeTarget: IAVM1SymbolBase, url: string, method: string): void {
      var context = this.context;
      var request = new context.sec.flash.net.URLRequest(url);
      if (method) {
        request.method = method;
      }
      var loader = new context.sec.flash.net.URLLoader(request);
      loader._ignoreDecodeErrors = true;
      loader.dataFormat = 'variables'; // flash.net.URLLoaderDataFormat.VARIABLES;
      function completeHandler(event: flash.events.Event): void {
        loader.removeEventListener(flash.events.Event.COMPLETE, completeHandler);
        release || Debug.assert(typeof loader.data === 'object');
        Shumway.AVMX.forEachPublicProperty(loader.data, function (key, value) {
          context.utils.setProperty(nativeTarget, key, value);
        });
        if (nativeTarget instanceof AVM1MovieClip) {
          avm1BroadcastEvent(context, nativeTarget, 'onData');
        }
      }
      loader.addEventListener(flash.events.Event.COMPLETE, completeHandler);
    }

    public mbchr(code) {
      code = alToInteger(this.context, code);
      return code ? String.fromCharCode(code) : '';
    }

    public mblength(expression) {
      return ('' + expression).length;
    }

    public mbord(character) {
      return ('' + character).charCodeAt(0);
    }

    public mbsubstring(value, index, count) {
      if (index !== (0 | index) || count !== (0 | count)) {
        // index or count are not integers, the result is the empty string.
        return '';
      }
      return ('' + value).substr(index, count);
    }

    public nextFrame() {
      var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context);
      this._addToPendingScripts(nativeTarget, nativeTarget.nextFrame);
    }

    public nextScene() {
      var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context);
      this._addToPendingScripts(nativeTarget, nativeTarget.nextScene);
    }

    public ord(character) {
      return ('' + character).charCodeAt(0); // ASCII only?
    }

    public play() {
      var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context);
      nativeTarget.play();
    }

    public prevFrame() {
      var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context);
      this._addToPendingScripts(nativeTarget, nativeTarget.prevFrame);
    }

    public prevScene() {
      var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context);
      this._addToPendingScripts(nativeTarget, nativeTarget.prevScene);
    }

    public print(target, boundingBox) {
      // flash.printing.PrintJob
      notImplemented('AVM1Globals.print');
    }

    public printAsBitmap(target, boundingBox) {
      notImplemented('AVM1Globals.printAsBitmap');
    }

    public printAsBitmapNum(level, boundingBox) {
      notImplemented('AVM1Globals.printAsBitmapNum');
    }

    public printNum(level, bondingBox) {
      notImplemented('AVM1Globals.printNum');
    }

    public random(value) {
      return 0 | (Math.random() * (0 | value));
    }

    public removeMovieClip(target) {
      var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context, target);
      nativeTarget.removeMovieClip();
    }

    public startDrag(target?, ...args: any[]): void {
      var mc = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context, target);
      mc.startDrag.apply(mc, args);
    }

    public stop() {
      var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context);
      nativeTarget.stop();
    }
    public stopAllSounds() {
      flash.media.SoundMixer.stopAll();
    }
    public stopDrag(target?) {
      var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context, target);
      nativeTarget.stopDrag();
    }
    public substring(value, index, count) {
      return this.mbsubstring(value, index, count); // ASCII Only?
    }
    public targetPath(target) {
      var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context, target);
      return nativeTarget._target;
    }
    public toggleHighQuality() {
      // flash.display.Stage.quality
      notImplemented('AVM1Globals.toggleHighQuality');
    }
    public trace(expression) {
      var value: string;
      switch (typeof expression) {
        case 'undefined':
          // undefined is always 'undefined' for trace (even for SWF6).
          value = 'undefined';
          break;
        case 'string':
          value = expression;
          break;
        default:
          value = alToString(this.context, expression);
          break;
      }

      Shumway.AVMX.AS.Natives.print(this.context.sec, value);
    }

    public unloadMovie(target) {
      var nativeTarget = AVM1Utils.resolveTarget<AVM1MovieClip>(this.context, target);
      nativeTarget.unloadMovie();
    }
    public unloadMovieNum(level) {
      var nativeTarget = AVM1Utils.resolveLevel(this.context, level);
      nativeTarget.unloadMovie();
    }
  }
}
