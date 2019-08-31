import { Component, Host, h, Prop } from '@stencil/core';
import { OutputFile } from '../stencil-repl/stencil-repl';

@Component({
  tag: 'repl-outputs',
  styleUrl: 'repl-outputs.css',
  shadow: true
})
export class ReplOutputs {

  @Prop() outputs: OutputFile[] = [];

  render() {
    const outputs = this.outputs.filter(o => o.name.endsWith('.js'));
    return (
      <Host>
        {(outputs.map(output => (
          <section>
            <div><code>{output.name}</code></div>
            <pre>{output.code}</pre>
          </section>
        )))}
      </Host>
    );
  }
}
