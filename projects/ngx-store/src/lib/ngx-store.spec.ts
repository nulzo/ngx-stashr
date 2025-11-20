import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxStore } from './ngx-store';

describe('NgxStore', () => {
  let component: NgxStore;
  let fixture: ComponentFixture<NgxStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxStore]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgxStore);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
