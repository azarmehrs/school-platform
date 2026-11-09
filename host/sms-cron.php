<?php
declare(strict_types=1);
require __DIR__.'/private/bootstrap.php';require __DIR__.'/private/migrations.php';require __DIR__.'/private/central.php';require __DIR__.'/private/sms.php';
date_default_timezone_set('Asia/Tehran');header('Content-Type: application/json; charset=utf-8');
try{
 migrate(db());$config=sms_config();$token=(string)($_GET['token']??'');school_require($config['cron_token']!==''&&hash_equals($config['cron_token'],$token),'دسترسی زمان‌بندی معتبر نیست.');school_require($config['enabled'],'سامانه پیامک غیرفعال است.');
 $row=db()->query('SELECT payload FROM pdm_school WHERE id=1')->fetch();school_require((bool)$row,'اطلاعات مدرسه پیدا نشد.');$state=json_decode($row['payload'],true,128,JSON_THROW_ON_ERROR);$now=date('H:i');$today=date('Y-m-d');$rules=$config['rules'];$due=[];
 if(!empty($rules['daily_grades']['enabled'])&&$now>=($rules['daily_grades']['time']??'18:00'))$due['daily_grades']=[$today,$today];
 if(!empty($rules['weekly_grades']['enabled'])&&date('w')===(string)($rules['weekly_grades']['weekday']??'5')&&$now>=($rules['weekly_grades']['time']??'18:00'))$due['weekly_grades']=[date('Y-m-d',strtotime('-6 days')),$today];
 if(!empty($rules['monthly_grades']['enabled'])&&date('j')===(string)($rules['monthly_grades']['day']??'1')&&$now>=($rules['monthly_grades']['time']??'18:00'))$due['monthly_grades']=[date('Y-m-01',strtotime('-1 month')),date('Y-m-t',strtotime('-1 month'))];
 $sent=0;$skipped=0;
 foreach($due as $kind=>[$from,$to])foreach($state['d']['students']??[] as $student){$contact=sms_guardian($state,(string)$student['id']);if(!$contact){$skipped++;continue;}$marks=[];foreach($state['d']['sessions']??[] as $session){if(($session['date']??'')<$from||($session['date']??'')>$to)continue;$record=$session['records'][$student['id']]??null;if(!$record)continue;foreach($record['marks']??[] as $mark)if(isset($mark['value']))$marks[]=($mark['type']??'نمره').' '.($mark['value']).(isset($mark['max'])?' از '.$mark['max']:'');}
  if(!$marks){$skipped++;continue;}$summary=implode('، ',array_slice($marks,0,12));$event=$kind.':'.$to.':'.$student['id'];$text=sms_template($rules[$kind]['template'],['student'=>$student['name']??'دانش‌آموز','summary'=>$summary]);sms_send_automatic(0,$kind,$event,sms_phone($contact['phone']),$text,['studentId'=>$student['id'],'from'=>$from,'to'=>$to]);$sent++;
 }
 echo json_encode(['ok'=>true,'processed'=>$sent,'skipped'=>$skipped,'date'=>$today],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
}catch(Throwable $e){http_response_code(400);echo json_encode(['error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);}
