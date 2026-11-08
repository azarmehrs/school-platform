import {addOffering,type School,type SchoolClass,type SchoolStudent,type Teacher,type TimetableSlot} from './central-demo';
import {normalize,uid} from './model';

export type SchoolImportPackage={
 version:1;year:string;majors:string[];grades:string[];
 classes:{name:string;grade:string;major:string}[];
 teachers:{name:string;phone?:string;email?:string;nationalCode?:string;personnelCode?:string}[];
 assignments:{class:string;subject:string;teacher:string}[];
 schedules?:{class:string;day:string;start_period:number;end_period:number;start_time:string;end_time:string;subject:string;teacher:string}[];
 studentFields?:{id:string;name:string;type:'text'|'number'|'date';required:boolean}[];
 students:{class:string;grade:string;major:string;order:number;code?:string;name:string;firstName?:string;lastName?:string;nationalCode?:string;father?:string;phone?:string;extra?:Record<string,string>;problems?:string;reviewRequired?:string}[];
};
export type ImportSummary={majors:number;classes:number;teachers:number;subjects:number;offerings:number;students:number;updatedStudents:number;enrollments:number;timetable:number;incompleteStudents:number;incompleteTeachers:number};

const key=(v:string)=>normalize(v).replace(/[\s‌]+/g,' ').trim();
const tempCode=(className:string,order:number)=>`TMP-${key(className).replace(/\s/g,'-')}-${String(order).padStart(3,'0')}`;
const missingStudent=(s:{name:string;father?:string;code?:string;problems?:string;reviewRequired?:string})=>{
 const fields:string[]=[];
 if(!key(s.name)||/نام کوچک موجود نیست/.test(s.problems||''))fields.push('نام کامل');
 if(!key(s.father||''))fields.push('نام پدر');
 if(!key(s.code||''))fields.push('کد دانش‌آموزی');
 if(key(s.reviewRequired||''))fields.push(key(s.reviewRequired!));
 return fields;
};
// Email is optional; a profile may exist before its login account is created.
const missingTeacher=(t:{phone?:string})=>!key(t.phone||'')?['شماره همراه']:[];
function findByName<T extends {name:string}>(rows:T[],name:string){return rows.find(x=>key(x.name)===key(name));}

export function validateSchoolPackage(value:unknown):SchoolImportPackage{
 if(!value||typeof value!=='object')throw Error('بسته ورود معتبر نیست');
 const p=value as SchoolImportPackage;
 if(p.version!==1||!key(p.year||'')||!Array.isArray(p.classes)||!Array.isArray(p.students)||!Array.isArray(p.teachers)||!Array.isArray(p.assignments))throw Error('ساختار بسته ورود مدرسه معتبر نیست');
 if(p.students.length>5000||p.assignments.length>3000)throw Error('حجم بسته ورود بیش از ظرفیت مجاز است');
 return p;
}

export function mergeSchoolPackage(current:School,input:SchoolImportPackage):{school:School;summary:ImportSummary;yearId:string}{
 const p=validateSchoolPackage(input),d=structuredClone(current);d.timetable??=[];d.customFields??=[];
 const summary:ImportSummary={majors:0,classes:0,teachers:0,subjects:0,offerings:0,students:0,updatedStudents:0,enrollments:0,timetable:0,incompleteStudents:0,incompleteTeachers:0};
 for(const f of p.studentFields||[]){if(!d.customFields.some(x=>key(x.name)===key(f.name))){d.customFields.push({id:f.id||uid(),name:key(f.name),type:f.type,required:!!f.required})}}
 let year=d.years.find(y=>key(y.name)===key(p.year));if(!year){year={id:uid(),name:key(p.year),archived:false};d.years.push(year)}
 for(const name of p.majors){if(!findByName(d.majors,name)){d.majors.push({id:uid(),name:key(name)});summary.majors++}}
 for(const [i,name] of p.grades.entries()){if(!findByName(d.grades,name))d.grades.push({id:uid(),name:key(name),order:10+i})}
 const classMap=new Map<string,SchoolClass>();
 for(const raw of p.classes){const major=findByName(d.majors,raw.major),grade=findByName(d.grades,raw.grade);if(!major||!grade)throw Error(`پایه یا رشته کلاس «${raw.name}» پیدا نشد`);let c=d.classes.find(x=>x.yearId===year!.id&&key(x.name)===key(raw.name));if(!c){c={id:uid(),yearId:year.id,majorId:major.id,gradeId:grade.id,section:'۱',name:key(raw.name)};d.classes.push(c);summary.classes++}classMap.set(key(raw.name),c)}
 const teacherMap=new Map<string,Teacher>();
 for(const raw of p.teachers){let t=findByName(d.teachers,raw.name);const missing=missingTeacher(raw);if(!t){t={id:uid(),name:key(raw.name),email:key(raw.email||''),phone:key(raw.phone||''),nationalCode:key(raw.nationalCode||''),personnelCode:key(raw.personnelCode||''),active:true,importKey:'teacher:'+key(raw.name),incomplete:missing.length>0,missingFields:missing};d.teachers.push(t);summary.teachers++}else{if(key(raw.phone||''))t.phone=key(raw.phone!);if(key(raw.email||''))t.email=key(raw.email!);if(key(raw.nationalCode||''))t.nationalCode=key(raw.nationalCode!);if(key(raw.personnelCode||''))t.personnelCode=key(raw.personnelCode!);t.missingFields=missingTeacher(t);t.incomplete=!!t.missingFields.length}if(t.incomplete)summary.incompleteTeachers++;teacherMap.set(key(raw.name),t)}
 const offeringMap=new Map<string,string>();
 for(const raw of p.assignments){const c=classMap.get(key(raw.class)),teacher=teacherMap.get(key(raw.teacher));if(!c)throw Error(`کلاس «${raw.class}» پیدا نشد`);let subject=d.subjects.find(s=>key(s.name)===key(raw.subject)&&s.gradeId===c.gradeId&&(s.majorId===c.majorId||s.majorId==='all'));if(!subject){subject={id:uid(),name:key(raw.subject),kind:'technical',gradeId:c.gradeId,majorId:c.majorId};d.subjects.push(subject);summary.subjects++}let offer=d.offerings.find(o=>o.classId===c.id&&o.subjectId===subject!.id);if(!offer){addOffering(d,c,subject);offer=d.offerings.at(-1)!;summary.offerings++}if(teacher)offer.teacherId=teacher.id;offeringMap.set(`${key(raw.class)}|${key(raw.subject)}`,offer.id)}
 const realCodes=new Set(d.students.filter(s=>!s.code.startsWith('TMP-')).map(s=>key(s.code)));
 for(const raw of p.students){const c=classMap.get(key(raw.class));if(!c)throw Error(`کلاس دانش‌آموز «${raw.class}» پیدا نشد`);const importKey=`student:${key(raw.class)}:${raw.order}`;const rawCode=key(raw.code||'');let s=d.students.find(x=>x.importKey===importKey)||(rawCode?d.students.find(x=>key(x.code)===rawCode):undefined);const extra={...(raw.extra||{})};const missing=[...missingStudent(raw),...(d.customFields||[]).filter(f=>f.required&&!key(extra[f.id]||'')).map(f=>f.name)];if(rawCode&&realCodes.has(rawCode)&&!s)throw Error(`کد دانش‌آموزی تکراری است: ${rawCode}`);if(!s){s={id:uid(),name:key(raw.name)||'نام ثبت نشده',firstName:key(raw.firstName||''),lastName:key(raw.lastName||''),nationalCode:key(raw.nationalCode||''),father:key(raw.father||''),code:rawCode||tempCode(raw.class,raw.order),phone:key(raw.phone||''),extra,importKey,incomplete:missing.length>0,missingFields:missing};d.students.push(s);summary.students++;if(rawCode)realCodes.add(rawCode)}else{const oldCode=s.code;if(rawCode&&oldCode.startsWith('TMP-')){s.code=rawCode;realCodes.add(rawCode)}if(key(raw.name).length>key(s.name).length)s.name=key(raw.name);if(!key(s.firstName||'')&&key(raw.firstName||''))s.firstName=key(raw.firstName!);if(!key(s.lastName||'')&&key(raw.lastName||''))s.lastName=key(raw.lastName!);if(!key(s.nationalCode||'')&&key(raw.nationalCode||''))s.nationalCode=key(raw.nationalCode!);if(!key(s.father)&&key(raw.father||''))s.father=key(raw.father!);if(!key(s.phone||'')&&key(raw.phone||''))s.phone=key(raw.phone!);s.extra={...(s.extra||{}),...extra};s.incomplete=missing.length>0;s.missingFields=missing;summary.updatedStudents++}if(s.incomplete)summary.incompleteStudents++;if(!d.enrollments.some(e=>e.yearId===year!.id&&e.studentId===s!.id)){d.enrollments.push({id:uid(),yearId:year.id,studentId:s.id,classId:c.id,status:'active'});summary.enrollments++}}
 for(const [i,raw] of (p.schedules||[]).entries()){const c=classMap.get(key(raw.class)),offeringId=offeringMap.get(`${key(raw.class)}|${key(raw.subject)}`);if(!c||!offeringId)continue;const importKey=`slot:${key(raw.class)}:${raw.day}:${raw.start_period}:${raw.end_period}:${key(raw.subject)}`;if(d.timetable.some(s=>s.importKey===importKey))continue;const slot:TimetableSlot={id:uid(),classId:c.id,offeringId,day:key(raw.day),startPeriod:Number(raw.start_period),endPeriod:Number(raw.end_period),startTime:key(raw.start_time),endTime:key(raw.end_time),importKey};d.timetable.push(slot);summary.timetable++;void i}
 return {school:d,summary,yearId:year.id};
}

