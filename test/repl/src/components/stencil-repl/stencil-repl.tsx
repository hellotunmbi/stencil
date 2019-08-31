import { Component, Host, h, Prop, State, Listen } from '@stencil/core';
import * as d from '../../../../../dist/declarations';
import { createCompiler, validateConfig } from '../../../../../compiler/stencil_next.esm';


@Component({
  tag: 'stencil-repl',
  styleUrl: 'stencil-repl.css',
  shadow: true
})
export class StencilRepl {

  @Prop() appName: string = 'Stencil App';
  @Prop() inputs: InputFile[] = [];

  @State() outputs: OutputFile[] = [];

  compiler: d.CompilerCore;

  async componentDidLoad() {
    const userConfig: d.Config = {
      outputTargets: [
        {
          type: 'experimental-dist-module',
          dir: 'dist'
        }
      ]
    };

    const validated = validateConfig(userConfig);
    logDiagnostics(validated.diagnostics);

    this.compiler = await createCompiler(validated.config);

    const watcher = await this.compiler.createWatcher();

    this.inputs.forEach(input => {
      this.compiler.sys.writeFileSync(input.name, input.code);
    });

    watcher.on('buildFinish', buildResults => {
      const outputTarget = buildResults.outputs.find(o => o.type === 'experimental-dist-module');
      if (outputTarget) {
        this.outputs = outputTarget.files.map(fileName => {
          const code = this.compiler.sys.readFileSync(fileName);
          const outputFile: OutputFile = {
            name: fileName,
            code
          };
          return outputFile;
        });
      }
    });

    await watcher.start();
  }

  @Listen('fileAdd')
  async fileAdd(ev: any) {
    const filePath = (ev.detail as InputFile).name;
    console.log('fileAdd', filePath);
    const code = (ev.detail as InputFile).code;
    this.compiler.sys.writeFileSync(filePath, code);
    this.inputs = [
      ...this.inputs,
      { name: filePath, code }
    ];
  }

  @Listen('fileUpdate')
  async fileUpdate(ev: any) {
    const filePath = (ev.detail as InputFile).name;
    console.log('fileUpdate',filePath);
    const code = (ev.detail as InputFile).code;
    this.compiler.sys.writeFileSync(filePath, code);
    const input = this.inputs.find(i => i.name === filePath);
    input.code = code;
    this.inputs = this.inputs.slice();
  }

  @Listen('fileDelete')
  async fileDelete(ev: any) {
    const filePath = (ev.detail as InputFile).name;
    console.log('fileDelete', filePath);
    this.compiler.sys.unlinkSync(filePath);
    this.inputs = this.inputs.filter(i => i.name !== filePath);
  }

  render() {
    return (
      <Host>
        <repl-header appName={this.appName}></repl-header>
        <repl-viewport>
          <repl-inputs slot="left" inputs={this.inputs}/>
          <repl-outputs slot="right" outputs={this.outputs}/>
        </repl-viewport>
      </Host>
    );
  }
}

const logDiagnostics = (diagnostics: d.Diagnostic[]) => {
  diagnostics.forEach(d => {
    if (d.level === 'error') {
      console.error(d.messageText);
    } else if (d.level === 'warn') {
      console.warn(d.messageText);
    } else {
      console.warn(d.messageText);
    }
  });
};

export interface InputFile {
  name: string;
  code?: string;
}

export interface OutputFile {
  name: string;
  code: string;
}
